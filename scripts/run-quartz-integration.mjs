import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const integrationRoot = path.join(repositoryRoot, ".integration");
const quartzRoot = path.join(integrationRoot, "quartz");
const sortingPluginRoot = path.join(integrationRoot, "custom-file-explorer-sorting-support");
const rootIndexRoot = path.join(integrationRoot, "root-index-panels");
const outputRoot = path.join(repositoryRoot, "integration-output");
const withoutPanels = path.join(outputRoot, "without-root-index-panels");
const withPanels = path.join(outputRoot, "with-root-index-panels");
const quartzRepository = process.env.QUARTZ_REPOSITORY ?? "https://github.com/jackyzha0/quartz.git";
const quartzRef = process.env.QUARTZ_REF ?? "v5";
const rootIndexRepository =
  process.env.ROOT_INDEX_PANELS_REPOSITORY ?? "https://github.com/VingGit/root-index-panels.git";
const rootIndexRef =
  process.env.ROOT_INDEX_PANELS_REF ?? "1d6c79df383ca10b596ffc36eb36655a5e3a7409";

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function cloneQuartz() {
  await rm(integrationRoot, { recursive: true, force: true });
  await mkdir(integrationRoot, { recursive: true });
  await run(
    "git",
    ["clone", "--depth", "1", "--branch", quartzRef, quartzRepository, quartzRoot],
    repositoryRoot,
  );

  const packageJson = path.join(quartzRoot, "package.json");
  await readFile(packageJson, "utf8");
}

async function prepareVault() {
  const contentRoot = path.join(quartzRoot, "content");
  await rm(contentRoot, { recursive: true, force: true });
  await cp(path.join(repositoryRoot, "test-vault"), contentRoot, { recursive: true });
}

async function prepareSortingPlugin() {
  await symlink(
    repositoryRoot,
    sortingPluginRoot,
    process.platform === "win32" ? "junction" : "dir",
  );
}

async function prepareRootIndexPanels() {
  await rm(rootIndexRoot, { recursive: true, force: true });
  await run("git", ["init", rootIndexRoot], repositoryRoot);
  await run("git", ["remote", "add", "origin", rootIndexRepository], rootIndexRoot);
  await run("git", ["fetch", "--depth", "1", "origin", rootIndexRef], rootIndexRoot);
  await run("git", ["checkout", "--detach", "FETCH_HEAD"], rootIndexRoot);
  await run(
    "npm",
    ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    rootIndexRoot,
  );
}

async function quartz(...args) {
  await run(process.execPath, ["quartz/bootstrap-cli.mjs", ...args], quartzRoot);
}

async function enableArticleNavigation() {
  const configPath = path.join(quartzRoot, "quartz.config.yaml");
  const config = await readFile(configPath, "utf8");
  const pluginStart = config.indexOf(`  - source: ${sortingPluginRoot}`);
  if (pluginStart < 0) throw new Error("Sorting plugin configuration is missing");
  const nextPlugin = config.indexOf("\n  - source:", pluginStart + 1);
  const pluginEnd = nextPlugin < 0 ? config.length : nextPlugin;
  const block = config.slice(pluginStart, pluginEnd);
  if (!block.includes("articleNavigation: false")) {
    throw new Error("Sorting plugin did not expose the articleNavigation option");
  }
  const configured = block
    .replace("articleNavigation: false", "articleNavigation: true")
    .replace(
      "previousArticleProperty: PreviousArticle",
      "previousArticleProperty: FallbackPrevious",
    )
    .replace("nextArticleProperty: NextArticle", "nextArticleProperty: FallbackNext");
  await writeFile(
    configPath,
    `${config.slice(0, pluginStart)}${configured}${config.slice(pluginEnd)}`,
  );
}

function orderedFolderKeys(manifest, folder) {
  const entry = manifest.folders[folder];
  if (!entry) throw new Error(`Sorting manifest has no entry for ${folder}`);
  return entry.order.filter((key) => key.startsWith("folder:")).map((key) => key.slice(7));
}

async function verifySites() {
  const cases = JSON.parse(
    await readFile(path.join(repositoryRoot, "test-vault", "integration-cases.json"), "utf8"),
  );
  const manifestPath = path.join("static", "custom-file-explorer-sorting.json");
  const withoutManifestText = await readFile(path.join(withoutPanels, manifestPath), "utf8");
  const withManifestText = await readFile(path.join(withPanels, manifestPath), "utf8");
  if (withoutManifestText !== withManifestText) {
    throw new Error("The two integration variants emitted different sorting manifests");
  }

  const manifest = JSON.parse(withManifestText);
  const rootFolders = [...cases.folders, cases.articleNavigationFolder];
  const expectedRootFolders = [...rootFolders].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }),
  );
  const actualRootFolders = orderedFolderKeys(manifest, "/").filter((folder) =>
    rootFolders.includes(folder),
  );
  if (JSON.stringify(actualRootFolders) !== JSON.stringify(expectedRootFolders)) {
    throw new Error(
      `Unexpected root order:\nexpected ${JSON.stringify(expectedRootFolders)}\nactual   ${JSON.stringify(actualRootFolders)}`,
    );
  }

  for (const folder of cases.folders.slice(0, -1)) {
    if (!manifest.folders[folder]) {
      throw new Error(`Sorting manifest did not include case folder ${folder}`);
    }
    await readFile(path.join(withoutPanels, folder, "index.html"), "utf8");
    await readFile(path.join(withPanels, folder, "index.html"), "utf8");
  }
  for (const folder of cases.targetFolders) {
    if (!manifest.folders[folder]) {
      throw new Error(`Sorting manifest did not include target-rule folder ${folder}`);
    }
  }

  const articleRule = manifest.folders[cases.articleNavigationFolder];
  if (!articleRule) {
    throw new Error("Sorting manifest has no Article Navigator fixture rule");
  }
  const articleOrder = articleRule.order
    .filter((key) => key.startsWith("file:"))
    .map((key) => key.slice("file:".length));
  if (JSON.stringify(articleOrder) !== JSON.stringify(cases.articleNavigationOrder)) {
    throw new Error(
      `Article order differs from created metadata:\nexpected ${JSON.stringify(cases.articleNavigationOrder)}\nactual   ${JSON.stringify(articleOrder)}`,
    );
  }
  const articleNavigation = manifest.articleNavigation;
  if (
    articleNavigation?.previousProperty !== "PreviousArticle" ||
    articleNavigation?.nextProperty !== "NextArticle"
  ) {
    throw new Error("Article Navigator property names were not detected from its settings file");
  }
  const purposeNavigation =
    articleNavigation.pages[`${cases.articleNavigationFolder}/purpose-statement`];
  if (
    purposeNavigation?.previous?.slug !==
      `${cases.articleNavigationFolder}/alpha-system-prompt-crafting` ||
    purposeNavigation?.next?.slug !== `${cases.articleNavigationFolder}/zulu-thesis-topic-overview`
  ) {
    throw new Error("Purpose statement navigation targets were not resolved correctly");
  }

  const contentIndex = JSON.parse(
    await readFile(path.join(withoutPanels, "static", "contentIndex.json"), "utf8"),
  );
  const purposeGraphLinks =
    contentIndex[`${cases.articleNavigationFolder}/purpose-statement`]?.links;
  const expectedGraphLinks = [
    `${cases.articleNavigationFolder}/alpha-system-prompt-crafting`,
    `${cases.articleNavigationFolder}/zulu-thesis-topic-overview`,
  ];
  if (
    !Array.isArray(purposeGraphLinks) ||
    expectedGraphLinks.some((link) => !purposeGraphLinks.includes(link))
  ) {
    throw new Error("Previous and Next article links are missing from Quartz's graph data");
  }

  const purposeHtml = await readFile(
    path.join(withoutPanels, cases.articleNavigationFolder, "purpose-statement.html"),
    "utf8",
  );
  const alphaBacklink = purposeHtml.indexOf("Alpha system prompt crafting");
  const zuluBacklink = purposeHtml.indexOf("Zulu thesis topic overview");
  if (alphaBacklink < 0 || zuluBacklink < 0 || alphaBacklink > zuluBacklink) {
    throw new Error("Article Navigator fixture does not begin with alphabetical Backlinks order");
  }

  const withoutRootHtml = await readFile(path.join(withoutPanels, "index.html"), "utf8");
  const withRootHtml = await readFile(path.join(withPanels, "index.html"), "utf8");
  if (withoutRootHtml.includes("rip-sidebar")) {
    throw new Error("Root Index Panels markup appeared in the disabled integration build");
  }
  if (!withRootHtml.includes("rip-sidebar")) {
    throw new Error("Root Index Panels markup is missing from the enabled integration build");
  }

  const switcher = withRootHtml.match(/<ul class="rip-sidebar-books">(?<contents>[\s\S]*?)<\/ul>/);
  if (!switcher?.groups?.contents) {
    throw new Error("Root Index Panels book switcher is missing");
  }
  const switcherFolders = [...switcher.groups.contents.matchAll(/href="\.\/([^/]+)\//g)].map(
    (match) => match[1],
  );
  if (JSON.stringify(switcherFolders) !== JSON.stringify(expectedRootFolders)) {
    throw new Error(
      `Root Index Panels order differs from sorting-spec:\nexpected ${JSON.stringify(expectedRootFolders)}\nactual   ${JSON.stringify(switcherFolders)}`,
    );
  }

  const resources = await readFile(path.join(withoutPanels, "index.html"), "utf8");
  const resourceNames = [
    ...resources.matchAll(/src="\.\/static\/(resource-after-[^"]+\.js)"/g),
  ].map((match) => match[1]);
  let foundExplorerAdapter = false;
  let foundFolderPageAdapter = false;
  let foundBacklinksAdapter = false;
  let foundArticleNavigationAdapter = false;
  for (const resource of resourceNames) {
    const contents = await readFile(path.join(withoutPanels, "static", resource), "utf8");
    if (contents.includes("custom-file-explorer-sorting.json")) foundExplorerAdapter = true;
    if (contents.includes(".page-listing ul.section-ul")) foundFolderPageAdapter = true;
    if (contents.includes(".backlinks ul.overflow")) foundBacklinksAdapter = true;
    if (contents.includes("cfes-article-navigation")) foundArticleNavigationAdapter = true;
  }
  if (!foundExplorerAdapter) {
    throw new Error("The stock Explorer sorting browser adapter was not emitted");
  }
  if (!foundFolderPageAdapter) {
    throw new Error("The folder-page sorting browser adapter was not emitted");
  }
  if (!foundBacklinksAdapter) {
    throw new Error("The Backlinks sorting browser adapter was not emitted");
  }
  if (!foundArticleNavigationAdapter) {
    throw new Error("The article-navigation browser adapter was not emitted");
  }

  const folderPageHtml = await readFile(
    path.join(withoutPanels, "25-files-first", "index.html"),
    "utf8",
  );
  if (!folderPageHtml.includes('class="page-listing"') || !folderPageHtml.includes("folder-3")) {
    throw new Error(
      "The integration fixture did not generate a folder-page listing with nested folders",
    );
  }
}

async function writeLandingPage() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Quartz sorting integration fixtures</title>
    <style>
      body { font: 1rem/1.55 system-ui, sans-serif; max-width: 48rem; margin: 4rem auto; padding: 0 1.25rem; }
      a { display: block; margin: 1rem 0; }
    </style>
  </head>
  <body>
    <h1>Quartz sorting integration fixtures</h1>
    <p>Both sites are generated from the repository's bundled test vault.</p>
    <a href="./without-root-index-panels/">Stock Explorer only</a>
    <a href="./with-root-index-panels/">Stock Explorer with Root Index Panels</a>
  </body>
</html>
`;
  await writeFile(path.join(outputRoot, "index.html"), html, "utf8");
}

await cloneQuartz();
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await prepareVault();
await prepareSortingPlugin();
await run("npm", ["ci", "--no-audit", "--no-fund"], quartzRoot);
await quartz("plugin", "add", sortingPluginRoot);
await quartz("plugin", "enable", "custom-file-explorer-sorting-support");
await enableArticleNavigation();
await quartz("build", "--output", withoutPanels);
await prepareRootIndexPanels();
await quartz("plugin", "add", rootIndexRoot);
await quartz("plugin", "enable", "root-index-panels");
await quartz("build", "--output", withPanels);
await verifySites();
await writeLandingPage();

console.log(`Verified both Quartz integration sites in ${outputRoot}`);
