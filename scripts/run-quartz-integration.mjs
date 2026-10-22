import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const integrationRoot = path.join(repositoryRoot, ".integration");
const quartzRoot = path.join(integrationRoot, "quartz");
const sortingPluginRoot = path.join(integrationRoot, "quartz-custom-file-explorer-sorting");
const localRootBooksRoot = process.env.ROOT_BOOKS_PATH
  ? path.resolve(process.env.ROOT_BOOKS_PATH)
  : undefined;
const rootBooksRoot =
  localRootBooksRoot ?? path.join(integrationRoot, "quartz-root-books-workspace");
const outputRoot = path.join(repositoryRoot, "integration-output");
const withoutRootBooks = path.join(outputRoot, "without-root-books");
const withRootBooks = path.join(outputRoot, "with-root-books");
const pagesProject =
  process.env.GITHUB_REPOSITORY?.split("/").filter(Boolean).at(-1) ??
  "quartz-custom-file-explorer-sorting";
const pagesBaseDir = `/${pagesProject}`;
const withoutRootBooksBaseDir = `${pagesBaseDir}/without-root-books`;
const withRootBooksBaseDir = `${pagesBaseDir}/with-root-books`;
const pagesOwner =
  process.env.GITHUB_REPOSITORY_OWNER ??
  process.env.GITHUB_REPOSITORY?.split("/").filter(Boolean)[0] ??
  "obsidian-material-plugins";
const pagesHost = `${pagesOwner.toLowerCase()}.github.io`;
const quartzRepository = process.env.QUARTZ_REPOSITORY ?? "https://github.com/jackyzha0/quartz.git";
const quartzRef = process.env.QUARTZ_REF ?? "v5";
const rootBooksRepository =
  process.env.ROOT_BOOKS_REPOSITORY ??
  "https://github.com/obsidian-material-plugins/quartz-root-books-workspace.git";
const rootBooksRef = process.env.ROOT_BOOKS_REF ?? "main";

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

async function prepareRootBooks() {
  if (localRootBooksRoot) {
    const manifest = JSON.parse(await readFile(path.join(rootBooksRoot, "package.json"), "utf8"));
    if (manifest.name !== "@obsidian-material-plugins/quartz-root-books-workspace") {
      throw new Error(`ROOT_BOOKS_PATH is not Quartz Root Books Workspace: ${rootBooksRoot}`);
    }
    await readFile(path.join(rootBooksRoot, "dist", "index.js"), "utf8");
    return;
  }
  await rm(rootBooksRoot, { recursive: true, force: true });
  await run("git", ["init", rootBooksRoot], repositoryRoot);
  await run("git", ["remote", "add", "origin", rootBooksRepository], rootBooksRoot);
  await run("git", ["fetch", "--depth", "1", "origin", rootBooksRef], rootBooksRoot);
  await run("git", ["checkout", "--detach", "FETCH_HEAD"], rootBooksRoot);
  await run(
    "npm",
    ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    rootBooksRoot,
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

async function setQuartzBaseUrl(baseDir) {
  const configPath = path.join(quartzRoot, "quartz.config.yaml");
  const config = await readFile(configPath, "utf8");
  const configured = config.replace(/^  baseUrl: .*$/m, `  baseUrl: ${pagesHost}${baseDir}`);
  if (configured === config) {
    throw new Error("Quartz configuration has no baseUrl to update");
  }
  await writeFile(configPath, configured, "utf8");
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
  const withoutManifestText = await readFile(path.join(withoutRootBooks, manifestPath), "utf8");
  const withManifestText = await readFile(path.join(withRootBooks, manifestPath), "utf8");
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
    await readFile(path.join(withoutRootBooks, folder, "index.html"), "utf8");
    await readFile(path.join(withRootBooks, folder, "index.html"), "utf8");
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
  const probe = cases.articleNavigationProbe;
  const probeNavigation = articleNavigation.pages[probe.slug];
  if (
    probeNavigation?.previous?.slug !== probe.previousSlug ||
    probeNavigation?.next?.slug !== probe.nextSlug
  ) {
    throw new Error("Article navigation probe targets were not resolved correctly");
  }
  const intentionalDuplicate = cases.articleNavigationIntentionalDuplicate;
  if (
    !articleNavigation.pages[intentionalDuplicate.source]?.contentLinks?.includes(
      intentionalDuplicate.target,
    )
  ) {
    throw new Error(
      "A Markdown body link that duplicates article navigation was not preserved in the manifest",
    );
  }

  const contentIndex = JSON.parse(
    await readFile(path.join(withoutRootBooks, "static", "contentIndex.json"), "utf8"),
  );
  const probeGraphLinks = contentIndex[probe.slug]?.links;
  const expectedGraphLinks = [
    probe.previousSlug,
    probe.nextSlug,
    ...cases.articleNavigationReferences[probe.slug],
  ];
  if (
    !Array.isArray(probeGraphLinks) ||
    expectedGraphLinks.some((link) => !probeGraphLinks.includes(link))
  ) {
    throw new Error("Article navigation or related links are missing from Quartz's graph data");
  }

  for (const [source, targets] of Object.entries(cases.articleNavigationReferences)) {
    const links = contentIndex[source]?.links;
    if (!Array.isArray(links) || targets.some((target) => !links.includes(target))) {
      throw new Error(`Random fixture references were not resolved for ${source}`);
    }
  }

  const probeHtml = await readFile(path.join(withoutRootBooks, `${probe.slug}.html`), "utf8");
  const previousBacklink = probeHtml.indexOf(probe.previousTitle);
  const nextBacklink = probeHtml.indexOf(probe.nextTitle);
  if (previousBacklink < 0 || nextBacklink < 0 || previousBacklink > nextBacklink) {
    throw new Error("Article Navigator fixture does not begin with alphabetical Backlinks order");
  }

  const withoutRootHtml = await readFile(path.join(withoutRootBooks, "index.html"), "utf8");
  const withRootHtml = await readFile(path.join(withRootBooks, "index.html"), "utf8");
  for (const [label, html, baseDir] of [
    ["disabled", withoutRootHtml, withoutRootBooksBaseDir],
    ["enabled", withRootHtml, withRootBooksBaseDir],
  ]) {
    if (!html.includes(`data-basepath="${baseDir}"`)) {
      throw new Error(`The Root Books ${label} build did not retain its GitHub Pages base path`);
    }
  }
  if (withoutRootHtml.includes("rip-sidebar")) {
    throw new Error("Root Books markup appeared in the disabled integration build");
  }
  if (!withRootHtml.includes("rip-sidebar")) {
    throw new Error("Root Books markup is missing from the enabled integration build");
  }

  const switcher = withRootHtml.match(/<ul class="rip-sidebar-books">(?<contents>[\s\S]*?)<\/ul>/);
  if (!switcher?.groups?.contents) {
    throw new Error("Root Books book switcher is missing");
  }
  const switcherFolders = [...switcher.groups.contents.matchAll(/href="\.\/([^/]+)\//g)].map(
    (match) => match[1],
  );
  if (JSON.stringify(switcherFolders) !== JSON.stringify(expectedRootFolders)) {
    throw new Error(
      `Root Books order differs from sorting-spec:\nexpected ${JSON.stringify(expectedRootFolders)}\nactual   ${JSON.stringify(switcherFolders)}`,
    );
  }

  const resources = await readFile(path.join(withoutRootBooks, "index.html"), "utf8");
  const resourceNames = [
    ...resources.matchAll(/src="\.\/static\/(resource-after-[^"]+\.js)"/g),
  ].map((match) => match[1]);
  let foundExplorerAdapter = false;
  let foundFolderPageAdapter = false;
  let foundBacklinksAdapter = false;
  let foundArticleNavigationAdapter = false;
  let foundArticleNavigationPopovers = false;
  let foundTargetedArticleNavigationPopovers = false;
  let foundIdempotentArticleNavigation = false;
  let foundArticleNavigationRenderBroadcast = false;
  let foundFinnishArticleNavigation = false;
  for (const resource of resourceNames) {
    const contents = await readFile(path.join(withoutRootBooks, "static", resource), "utf8");
    if (contents.includes("custom-file-explorer-sorting.json")) foundExplorerAdapter = true;
    if (contents.includes(".page-listing ul.section-ul")) foundFolderPageAdapter = true;
    if (contents.includes(".backlinks ul.overflow")) foundBacklinksAdapter = true;
    if (contents.includes("cfes-article-navigation")) foundArticleNavigationAdapter = true;
    if (contents.includes("internal-link") && contents.includes("dataset.slug")) {
      foundArticleNavigationPopovers = true;
    }
    if (
      contents.includes("cfes-article-navigation-link") &&
      contents.includes("mouseenter") &&
      contents.includes("mouseleave") &&
      contents.includes("active-popover")
    ) {
      foundTargetedArticleNavigationPopovers = true;
    }
    if (contents.includes("cfesNavigationKey")) foundIdempotentArticleNavigation = true;
    if (contents.includes('source:"cfes-article-navigation"')) {
      foundArticleNavigationRenderBroadcast = true;
    }
    if (contents.includes("Edellinen") && contents.includes("Seuraava")) {
      foundFinnishArticleNavigation = true;
    }
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
  if (!foundArticleNavigationPopovers) {
    throw new Error("Article navigation did not emit Quartz-compatible popover links");
  }
  if (!foundTargetedArticleNavigationPopovers) {
    throw new Error("Article navigation did not bind targeted Quartz-compatible popovers");
  }
  if (!foundIdempotentArticleNavigation) {
    throw new Error("Article navigation is not guarded against repeated Quartz render cycles");
  }
  if (foundArticleNavigationRenderBroadcast) {
    throw new Error("Article navigation still broadcasts a site-wide Quartz render event");
  }
  if (!foundFinnishArticleNavigation) {
    throw new Error("Finnish article-navigation labels were not emitted");
  }

  const folderPageHtml = await readFile(
    path.join(withoutRootBooks, "25-files-first", "index.html"),
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
    <a href="./without-root-books/">Stock Explorer only</a>
    <a href="./with-root-books/">Stock Explorer with Root Books</a>
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
await quartz("plugin", "enable", "quartz-custom-file-explorer-sorting");
await enableArticleNavigation();
await setQuartzBaseUrl(withoutRootBooksBaseDir);
await quartz("build", "--output", withoutRootBooks, "--baseDir", withoutRootBooksBaseDir);
await prepareRootBooks();
await quartz("plugin", "add", rootBooksRoot);
await quartz("plugin", "enable", "quartz-root-books-workspace");
await setQuartzBaseUrl(withRootBooksBaseDir);
await quartz("build", "--output", withRootBooks, "--baseDir", withRootBooksBaseDir);
await verifySites();
await writeLandingPage();

console.log(`Verified both Quartz integration sites in ${outputRoot}`);
