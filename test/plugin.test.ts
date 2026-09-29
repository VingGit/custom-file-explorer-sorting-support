import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Root } from "hast";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VFile } from "vfile";

vi.mock("../src/scripts/explorer.inline.ts", () => ({
  default: "fetch('static/custom-file-explorer-sorting.json')",
}));

import { CustomFileExplorerSortingSupport } from "../src/plugin";
import type { BuildCtx, ProcessedContent, StaticResources } from "../src/quartz";
import { EXPLORER_MANIFEST_PATH, SORTING_SERVICE_SYMBOL } from "../src/types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

function content(slug: string, relativePath: string, frontmatter = {}): ProcessedContent {
  const file = new VFile("");
  file.data = { slug, relativePath, frontmatter };
  return [{ type: "root", children: [] } as Root, file];
}

describe("Quartz plugin", () => {
  it("registers the shared service and emits a deterministic manifest", async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), "quartz-sort-"));
    temporaryDirectories.push(output);
    const plugin = CustomFileExplorerSortingSupport();
    const ctx = {
      argv: { output },
    } as BuildCtx;
    const resources = { css: [], js: [], additionalHead: [] } as StaticResources;
    const emitted = await plugin.emit(
      ctx,
      [
        content("index", "index.md", { "sorting-spec": "Beta\nAlpha" }),
        content("Alpha/index", "Alpha/index.md"),
        content("Beta/index", "Beta/index.md"),
      ],
      resources,
    );

    expect(emitted).toEqual([
      path.join(output, ...EXPLORER_MANIFEST_PATH.split("/")).replace(/\\/g, "/"),
    ]);
    expect(
      JSON.parse(await fs.readFile(path.join(output, EXPLORER_MANIFEST_PATH), "utf8")),
    ).toEqual({
      version: 1,
      folders: { "/": { order: ["folder:Beta", "folder:Alpha"], hidden: [] } },
    });
    expect(
      (globalThis as unknown as Record<symbol, unknown>)[Symbol.for(SORTING_SERVICE_SYMBOL)],
    ).toMatchObject({ apiVersion: 1 });
  });

  it("injects a browser script that reads the Explorer manifest", () => {
    const resources = CustomFileExplorerSortingSupport().externalResources?.({} as BuildCtx);
    expect(resources?.js).toHaveLength(1);
    expect(resources?.js?.[0]).toMatchObject({
      contentType: "inline",
      loadTime: "afterDOMReady",
    });
    expect(resources?.js?.[0]?.script).toContain("custom-file-explorer-sorting.json");
  });
});
