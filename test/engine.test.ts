import { describe, expect, it } from "vitest";

import {
  buildExplorerOrderManifest,
  createSortingService,
  validateSortingSpecifications,
} from "../src/engine";
import type { QuartzSortInput } from "../src/types";

interface NoteOptions {
  frontmatter?: Record<string, unknown>;
  created?: string | number | Date;
  modified?: string | number | Date;
  relativePath?: string;
}

function note(slug: string, options: NoteOptions = {}) {
  return {
    slug,
    relativePath: options.relativePath ?? `${slug}.md`,
    frontmatter: options.frontmatter ?? {},
    dates: { created: options.created, modified: options.modified },
  };
}

function sortPaths(
  allFiles: unknown[],
  folderPath: string,
  entries: Array<{ path: string; isFolder?: boolean }>,
): string[] {
  const inputs: QuartzSortInput<string>[] = entries.map(({ path, isFolder = false }) => ({
    value: path,
    path,
    isFolder,
  }));
  return createSortingService().sort(folderPath, inputs, allFiles).items;
}

describe("sorting engine", () => {
  it("applies the exact index.md metadata rule used by the Quartz vaults", () => {
    const allFiles = [
      note("index", {
        frontmatter: { "sorting-spec": "< a-z by-metadata: created" },
        relativePath: "index.md",
      }),
      note("Later/index", {
        frontmatter: { created: "2025-06-01" },
        relativePath: "Later/index.md",
      }),
      note("First/index", {
        frontmatter: { created: "2024-01-01" },
        relativePath: "First/index.md",
      }),
    ];

    expect(
      sortPaths(allFiles, "/", [
        { path: "Later", isFolder: true },
        { path: "First", isFolder: true },
      ]),
    ).toEqual(["First", "Later"]);
  });

  it("lets every folder use the specification from its own index note", () => {
    const allFiles = [
      note("index", {
        frontmatter: { "sorting-spec": "> a-z" },
        relativePath: "index.md",
      }),
      note("Book/index", {
        frontmatter: { "sorting-spec": "< a-z" },
        relativePath: "Book/index.md",
      }),
      note("Book/zebra", { relativePath: "Book/zebra.md" }),
      note("Book/alpha", { relativePath: "Book/alpha.md" }),
    ];

    expect(sortPaths(allFiles, "Book", [{ path: "Book/zebra" }, { path: "Book/alpha" }])).toEqual([
      "Book/alpha",
      "Book/zebra",
    ]);
  });

  it("supports explicit groups, priorities, combined groups, macros, and navigation-only hiding", () => {
    const allFiles = [
      note("index", {
        relativePath: "index.md",
        frontmatter: {
          "sorting-spec": [
            "target-folder: /",
            "/!!! Important...",
            "/+ /:files Draft...",
            "/+ /folders Work...",
            "  < a-z",
            "{:%parent-folder-name%:}",
            "--% hidden.md",
            "/--hide: Secret",
          ].join("\n"),
        },
      }),
      note("Important item"),
      note("Draft 2"),
      note("hidden", { relativePath: "hidden.md" }),
      note("Work 1/index", { relativePath: "Work 1/index.md" }),
      note("Secret/index", { relativePath: "Secret/index.md" }),
    ];

    const result = sortPaths(allFiles, "/", [
      { path: "Work 1", isFolder: true },
      { path: "hidden" },
      { path: "Draft 2" },
      { path: "Secret", isFolder: true },
      { path: "Important item" },
    ]);

    expect(result).toEqual(["Important item", "Draft 2", "Work 1"]);
  });

  it("supports numeric, Roman numeral, date, and metadata-extractor syntax", () => {
    const allFiles = [
      note("index", {
        relativePath: "index.md",
        frontmatter: {
          "sorting-spec": [
            "Chapter \\d+ ...",
            "Appendix \\R+ ...",
            "\\[yyyy-mm-dd] ...",
            "/:files with-metadata: released",
            "  < a-z by-metadata: released using-extractor: date(dd/mm/yyyy)",
          ].join("\n"),
        },
      }),
      note("Chapter 10 Notes"),
      note("Chapter 2 Notes"),
      note("Appendix IX Notes"),
      note("Appendix IV Notes"),
      note("2025-01-01 Release"),
      note("2024-12-01 Release"),
      note("metadata-later", { frontmatter: { released: "02/06/2025" } }),
      note("metadata-first", { frontmatter: { released: "01/01/2024" } }),
    ];

    expect(
      sortPaths(allFiles, "/", [
        { path: "Chapter 10 Notes" },
        { path: "Chapter 2 Notes" },
        { path: "Appendix IX Notes" },
        { path: "Appendix IV Notes" },
        { path: "2025-01-01 Release" },
        { path: "2024-12-01 Release" },
        { path: "metadata-later" },
        { path: "metadata-first" },
      ]),
    ).toEqual([
      "Chapter 2 Notes",
      "Chapter 10 Notes",
      "Appendix IV Notes",
      "Appendix IX Notes",
      "2024-12-01 Release",
      "2025-01-01 Release",
      "metadata-first",
      "metadata-later",
    ]);
  });

  it("maps bookmark and icon integrations to frontmatter", () => {
    const allFiles = [
      note("index", {
        relativePath: "index.md",
        frontmatter: {
          "sorting-spec": [
            "bookmarked:",
            "  < by-bookmarks-order",
            "with-icon: star",
            "< a-z",
          ].join("\n"),
        },
      }),
      note("later", { frontmatter: { "bookmarks-order": 9 } }),
      note("first", { frontmatter: { "bookmarks-order": 1 } }),
      note("starred", { frontmatter: { icon: "star" } }),
      note("panel-starred", { frontmatter: { panel: { icon: "star" } } }),
      note("ordinary"),
    ];

    expect(
      sortPaths(allFiles, "/", [
        { path: "ordinary" },
        { path: "later" },
        { path: "panel-starred" },
        { path: "first" },
        { path: "starred" },
      ]),
    ).toEqual(["first", "later", "panel-starred", "starred", "ordinary"]);
  });

  it("resolves exact path, folder-name, wildcard, and regular-expression targets", () => {
    const allFiles = [
      note("rules", {
        relativePath: "rules.md",
        frontmatter: {
          "sorting-spec": [
            "target-folder: Exact",
            "> a-z",
            "target-folder: name: Named",
            "> a-z",
            "target-folder: Projects/*",
            "> a-z",
            "target-folder: regexp: for-name: ^Archive$",
            "> a-z",
          ].join("\n"),
        },
      }),
      note("Exact/a"),
      note("Exact/z"),
      note("Container/Named/a"),
      note("Container/Named/z"),
      note("Projects/One/a"),
      note("Projects/One/z"),
      note("Some/Archive/a"),
      note("Some/Archive/z"),
    ];
    const entries = (folder: string) => [{ path: `${folder}/a` }, { path: `${folder}/z` }];

    expect(sortPaths(allFiles, "Exact", entries("Exact"))).toEqual(["Exact/z", "Exact/a"]);
    expect(sortPaths(allFiles, "Container/Named", entries("Container/Named"))).toEqual([
      "Container/Named/z",
      "Container/Named/a",
    ]);
    expect(sortPaths(allFiles, "Projects/One", entries("Projects/One"))).toEqual([
      "Projects/One/z",
      "Projects/One/a",
    ]);
    expect(sortPaths(allFiles, "Some/Archive", entries("Some/Archive"))).toEqual([
      "Some/Archive/z",
      "Some/Archive/a",
    ]);
  });

  it("implements standard, file/folder, true alphabetic, VS Code, and date orders", () => {
    const parseableOrders = [
      "sorting: standard",
      "< a-z, files-first",
      "> true a-z., folders-first",
      "< modified",
      "> created",
      "< advanced modified",
      "> advanced recursive created",
      "< vsc-unicode",
      "> vsc-unicode-natural",
      "< by-bookmarks-order",
    ];

    for (const sortingSpec of parseableOrders) {
      expect(() =>
        validateSortingSpecifications([
          note("index", { relativePath: "index.md", frontmatter: { "sorting-spec": sortingSpec } }),
        ]),
      ).not.toThrow();
    }
  });

  it("uses direct or recursive descendant dates for advanced folder sorting", () => {
    const directFiles = [
      note("index", {
        relativePath: "index.md",
        frontmatter: { "sorting-spec": "< advanced recursive modified" },
      }),
      note("Old/index", { relativePath: "Old/index.md", modified: "2020-01-01" }),
      note("Old/Deep/new", { relativePath: "Old/Deep/new.md", modified: "2026-01-01" }),
      note("Middle/index", { relativePath: "Middle/index.md", modified: "2024-01-01" }),
    ];

    expect(
      sortPaths(directFiles, "/", [
        { path: "Old", isFolder: true },
        { path: "Middle", isFolder: true },
      ]),
    ).toEqual(["Middle", "Old"]);
  });

  it("fails the build on an invalid specification", () => {
    expect(() =>
      validateSortingSpecifications([
        note("index", {
          relativePath: "index.md",
          frontmatter: { "sorting-spec": "order-asc:" },
        }),
      ]),
    ).toThrow(/Invalid Custom File Explorer sorting specification/);
  });
});

describe("Explorer order manifest", () => {
  it("contains root and nested ordering plus hidden navigation entries", () => {
    const manifest = buildExplorerOrderManifest([
      note("index", {
        relativePath: "index.md",
        frontmatter: { "sorting-spec": "Beta\nAlpha\n--% hidden.md" },
      }),
      note("Alpha/index", {
        relativePath: "Alpha/index.md",
        frontmatter: { "sorting-spec": "> a-z" },
      }),
      note("Beta/index", { relativePath: "Beta/index.md" }),
      note("hidden", { relativePath: "hidden.md" }),
      note("Alpha/a", { relativePath: "Alpha/a.md" }),
      note("Alpha/z", { relativePath: "Alpha/z.md" }),
    ]);

    expect(manifest).toEqual({
      version: 1,
      folders: {
        "/": {
          order: ["folder:Beta", "folder:Alpha"],
          hidden: ["file:hidden"],
        },
        Alpha: {
          order: ["file:Alpha/z", "file:Alpha/a"],
          hidden: [],
        },
      },
    });
  });
});
