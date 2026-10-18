import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildArticleNavigationManifest,
  resolveArticleNavigationProperties,
} from "../src/article-navigation";
import { normalizeOptions } from "../src/engine";
import type { BuildCtx } from "../src/quartz";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

function note(slug: string, frontmatter: Record<string, unknown> = {}) {
  return { slug, relativePath: `${slug}.md`, frontmatter };
}

describe("article navigation manifest", () => {
  it("resolves Article Navigator wikilinks and target titles", () => {
    const options = normalizeOptions({
      articleNavigation: true,
      previousArticleProperty: "PreviousEntry",
      nextArticleProperty: "NextEntry",
    });
    const manifest = buildArticleNavigationManifest(
      [
        note("Diary/Zulu earlier", { title: "Earlier entry" }),
        note("Diary/Current", {
          PreviousEntry: "[[Zulu earlier]]",
          NextEntry: "[[Alpha later|Continue]]",
        }),
        note("Diary/Alpha later"),
      ],
      options,
      { previous: "PreviousEntry", next: "NextEntry" },
    );

    expect(manifest.pages["Diary/Current"]).toEqual({
      previous: { slug: "Diary/Zulu earlier", title: "Earlier entry" },
      next: { slug: "Diary/Alpha later", title: "Alpha later" },
    });
  });

  it("detects property names from Article Navigator before using configured fallbacks", async () => {
    const contentDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "quartz-article-nav-"));
    temporaryDirectories.push(contentDirectory);
    const settingsDirectory = path.join(
      contentDirectory,
      ".obsidian",
      "plugins",
      "article-navigator",
    );
    await fs.mkdir(settingsDirectory, { recursive: true });
    await fs.writeFile(
      path.join(settingsDirectory, "data.json"),
      JSON.stringify({ previousKey: "DetectedPrevious", nextKey: "DetectedNext" }),
      "utf8",
    );

    const properties = await resolveArticleNavigationProperties(
      { argv: { directory: contentDirectory } } as BuildCtx,
      normalizeOptions({
        previousArticleProperty: "FallbackPrevious",
        nextArticleProperty: "FallbackNext",
      }),
    );

    expect(properties).toEqual({ previous: "DetectedPrevious", next: "DetectedNext" });
  });
});
