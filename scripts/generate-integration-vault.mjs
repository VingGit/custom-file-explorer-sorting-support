import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vaultRoot = path.join(repositoryRoot, "test-vault");

const styleCases = [
  ["01-a-z", "Alphabetical ascending", "< a-z"],
  ["02-a-z-desc", "Alphabetical descending", "> a-z"],
  ["03-a-z-extension", "Alphabetical with extension", "< a-z."],
  ["04-a-z-extension-desc", "Alphabetical with extension descending", "> a-z."],
  ["05-true-a-z", "True alphabetical ascending", "< true a-z"],
  ["06-true-a-z-desc", "True alphabetical descending", "> true a-z"],
  ["07-true-a-z-extension", "True alphabetical with extension", "< true a-z."],
  ["08-true-a-z-extension-desc", "True alphabetical with extension descending", "> true a-z."],
  ["09-created", "Created oldest first", "< created"],
  ["10-created-desc", "Created newest first", "> created"],
  ["11-modified", "Modified oldest first", "< modified"],
  ["12-modified-desc", "Modified newest first", "> modified"],
  ["13-advanced-created", "Advanced created oldest first", "< advanced created"],
  ["14-advanced-created-desc", "Advanced created newest first", "> advanced created"],
  ["15-advanced-modified", "Advanced modified oldest first", "< advanced modified"],
  ["16-advanced-modified-desc", "Advanced modified newest first", "> advanced modified"],
  [
    "17-advanced-recursive-created",
    "Advanced recursive created oldest first",
    "< advanced recursive created",
  ],
  [
    "18-advanced-recursive-created-desc",
    "Advanced recursive created newest first",
    "> advanced recursive created",
  ],
  [
    "19-advanced-recursive-modified",
    "Advanced recursive modified oldest first",
    "< advanced recursive modified",
  ],
  [
    "20-advanced-recursive-modified-desc",
    "Advanced recursive modified newest first",
    "> advanced recursive modified",
  ],
  ["21-standard", "Quartz standard fallback", "sorting: standard"],
  ["22-ui-selected", "UI-selected alias", "sorting: ui selected"],
  ["23-bookmarks", "Bookmark order", "< by-bookmarks-order"],
  ["24-bookmarks-desc", "Bookmark order descending", "> by-bookmarks-order"],
  ["25-files-first", "Files first", "< files-first"],
  ["26-folders-first", "Folders first", "< folders-first"],
  ["27-vsc-unicode", "VS Code Unicode", "< vsc-unicode"],
  ["28-vsc-unicode-desc", "VS Code Unicode descending", "> vsc-unicode"],
  ["29-vsc-unicode-natural", "VS Code Unicode natural", "< vsc-unicode-natural"],
  ["30-vsc-unicode-natural-desc", "VS Code Unicode natural descending", "> vsc-unicode-natural"],
  ["31-unicode-charcode", "Unicode charcode alias", "< unicode-charcode"],
  ["32-unicode-charcode-desc", "Unicode charcode alias descending", "> unicode-charcode"],
  ["33-unicode-charcode-natural", "Unicode charcode natural alias", "< unicode-charcode-natural"],
  [
    "34-unicode-charcode-natural-desc",
    "Unicode charcode natural alias descending",
    "> unicode-charcode-natural",
  ],
  ["35-metadata-a-z", "Metadata alphabetical", "< a-z by-metadata: rank"],
  ["36-metadata-a-z-desc", "Metadata alphabetical descending", "> a-z by-metadata: rank"],
  ["37-metadata-true-a-z", "Metadata true alphabetical", "< true a-z by-metadata: rank"],
  [
    "38-metadata-true-a-z-desc",
    "Metadata true alphabetical descending",
    "> true a-z by-metadata: rank",
  ],
  ["39-metadata-a-z-extension", "Metadata alphabetical extension", "< a-z. by-metadata: rank"],
  [
    "40-metadata-a-z-extension-desc",
    "Metadata alphabetical extension descending",
    "> a-z. by-metadata: rank",
  ],
  [
    "41-metadata-true-a-z-extension",
    "Metadata true alphabetical extension",
    "< true a-z. by-metadata: rank",
  ],
  [
    "42-metadata-true-a-z-extension-desc",
    "Metadata true alphabetical extension descending",
    "> true a-z. by-metadata: rank",
  ],
];

const featureCases = [
  [
    "43-metadata-extractor",
    "Metadata date extractor",
    "< a-z by-metadata: released using-extractor: date(dd/mm/yyyy)",
  ],
  [
    "44-secondary-order",
    "Primary and secondary ordering",
    String.raw`Chapter \d+ ...
  < a-z, created desc
...
  < a-z`,
  ],
  [
    "45-groups-priority-combine",
    "Groups, priority, combination, and macros",
    `/!!! Important...
/+ /:files Draft...
/+ /folders Work...
  < a-z
{:%parent-folder-name%:}
...
  < a-z`,
  ],
  [
    "46-frontmatter-groups",
    "Bookmark, icon, and metadata groups",
    `bookmarked:
  < by-bookmarks-order
with-icon: star
/:files with-metadata: rank
  < a-z by-metadata: rank
...
  < a-z`,
  ],
  [
    "47-numeric-roman-date-matchers",
    "Numeric, Roman numeral, and date matchers",
    String.raw`Chapter \d+ ...
Appendix \R+ ...
\[yyyy-mm-dd] ...
...
  < a-z`,
  ],
  [
    "48-navigation-hide",
    "Navigation-only hiding",
    `--% hidden.md
/--hide: Secret
...
  < a-z`,
  ],
];

function frontmatter(lines) {
  return `---\n${lines.join("\n")}\n---\n\n`;
}

async function write(relativePath, contents) {
  const destination = path.join(vaultRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

function sortingIndex(title, spec) {
  const indented = spec
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return (
    frontmatter([
      `title: "${title}"`,
      "created: 2024-01-01T00:00:00Z",
      "modified: 2024-06-01T00:00:00Z",
      "sorting-spec: |",
      indented,
    ]) + `# ${title}\n\nThis folder is part of the bundled Quartz integration fixture.\n`
  );
}

function sampleNote(title, created, modified, rank, bookmark, iconLine = "") {
  const lines = [
    `title: "${title}"`,
    `created: ${created}`,
    `modified: ${modified}`,
    `rank: "${rank}"`,
    `released: "${created.slice(8, 10)}/${created.slice(5, 7)}/${created.slice(0, 4)}"`,
    `bookmarks-order: ${bookmark}`,
  ];
  if (iconLine) lines.push(iconLine);
  return frontmatter(lines) + `# ${title}\n\nDeterministic integration-test content.\n`;
}

async function writeCommonEntries(slug) {
  const entries = [
    [
      "Alpha.md",
      "Alpha",
      "2024-02-01T00:00:00Z",
      "2024-05-01T00:00:00Z",
      "bravo",
      30,
      "icon: circle",
    ],
    [
      "item-2.md",
      "item 2",
      "2024-01-01T00:00:00Z",
      "2024-06-01T00:00:00Z",
      "alpha",
      10,
      "icon: star",
    ],
    [
      "item-10.md",
      "item 10",
      "2024-03-01T00:00:00Z",
      "2024-04-01T00:00:00Z",
      "charlie",
      20,
      "panel: { icon: star }",
    ],
    ["Zulu.md", "Zulu", "2024-04-01T00:00:00Z", "2024-03-01T00:00:00Z", "delta", 40, ""],
  ];

  for (const [file, title, created, modified, rank, bookmark, icon] of entries) {
    await write(`${slug}/${file}`, sampleNote(title, created, modified, rank, bookmark, icon));
  }

  await write(
    `${slug}/folder-3/index.md`,
    sampleNote(
      "folder 3",
      "2024-05-01T00:00:00Z",
      "2024-02-01T00:00:00Z",
      "echo",
      50,
      "icon: folder",
    ),
  );
  await write(
    `${slug}/folder-20/index.md`,
    sampleNote(
      "folder 20",
      "2023-12-01T00:00:00Z",
      "2024-07-01T00:00:00Z",
      "foxtrot",
      60,
      "icon: folder",
    ),
  );
  await write(
    `${slug}/folder-20/deep-child.md`,
    sampleNote("deep child", "2023-01-01T00:00:00Z", "2025-01-01T00:00:00Z", "golf", 70),
  );
}

async function writeFeatureSpecificEntries(slug) {
  if (slug === "44-secondary-order") {
    for (const [file, created] of [
      ["Chapter 2 alpha.md", "2024-01-01T00:00:00Z"],
      ["Chapter 2 beta.md", "2025-01-01T00:00:00Z"],
      ["Chapter 10 alpha.md", "2023-01-01T00:00:00Z"],
    ]) {
      await write(`${slug}/${file}`, sampleNote(file.slice(0, -3), created, created, file, 80));
    }
  }

  if (slug === "45-groups-priority-combine") {
    await write(
      `${slug}/Important item.md`,
      sampleNote("Important item", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z", "one", 1),
    );
    await write(
      `${slug}/Draft 2.md`,
      sampleNote("Draft 2", "2024-02-01T00:00:00Z", "2024-02-01T00:00:00Z", "two", 2),
    );
    await write(
      `${slug}/Work 1/index.md`,
      sampleNote("Work 1", "2024-03-01T00:00:00Z", "2024-03-01T00:00:00Z", "three", 3),
    );
  }

  if (slug === "47-numeric-roman-date-matchers") {
    for (const file of [
      "Chapter 10 Notes.md",
      "Chapter 2 Notes.md",
      "Appendix IX Notes.md",
      "Appendix IV Notes.md",
      "2025-01-01 Release.md",
      "2024-12-01 Release.md",
    ]) {
      await write(
        `${slug}/${file}`,
        sampleNote(file.slice(0, -3), "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z", file, 90),
      );
    }
  }

  if (slug === "48-navigation-hide") {
    await write(
      `${slug}/hidden.md`,
      sampleNote("hidden", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z", "hidden", 1),
    );
    await write(
      `${slug}/Secret/index.md`,
      sampleNote("Secret", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z", "secret", 2),
    );
  }
}

async function writeTargetFixture() {
  const slug = "49-target-folder-rules";
  const spec = `target-folder: ${slug}/exact
> a-z
target-folder: name: named-target
> a-z
target-folder: ${slug}/wildcards/*
> a-z
target-folder: regexp: for-name: ^regex-target$
> a-z`;
  await write(`${slug}/index.md`, sortingIndex("Target folder rules", spec));

  for (const folder of [
    `${slug}/exact`,
    `${slug}/container/named-target`,
    `${slug}/wildcards/one`,
    `${slug}/container/regex-target`,
  ]) {
    await write(
      `${folder}/alpha.md`,
      sampleNote("alpha", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z", "alpha", 1),
    );
    await write(
      `${folder}/zulu.md`,
      sampleNote("zulu", "2024-02-01T00:00:00Z", "2024-02-01T00:00:00Z", "zulu", 2),
    );
  }
}

await rm(vaultRoot, { recursive: true, force: true });
await mkdir(vaultRoot, { recursive: true });

const cases = [...styleCases, ...featureCases];
await write(
  "index.md",
  sortingIndex("Sorting integration vault", "< a-z") +
    "\nEvery first-level folder exercises a distinct upstream sorting mode or grammar feature.\n",
);

for (const [slug, title, spec] of cases) {
  await write(`${slug}/index.md`, sortingIndex(title, spec));
  await writeCommonEntries(slug);
  await writeFeatureSpecificEntries(slug);
}

await writeTargetFixture();
await write(
  "integration-cases.json",
  `${JSON.stringify(
    {
      version: 1,
      folders: [...cases.map(([slug]) => slug), "49-target-folder-rules"],
      targetFolders: [
        "49-target-folder-rules/exact",
        "49-target-folder-rules/container/named-target",
        "49-target-folder-rules/wildcards/one",
        "49-target-folder-rules/container/regex-target",
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${cases.length + 1} integration cases in ${vaultRoot}`);
