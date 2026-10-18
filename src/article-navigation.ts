import fs from "node:fs/promises";
import path from "node:path";

import {
  buildVaultModel,
  normalizeCanonicalPath,
  ownValue,
  type VaultFileRecord,
  type VaultModel,
} from "./model";
import type { BuildCtx } from "./quartz";
import type {
  ArticleNavigationManifest,
  ArticleNavigationPage,
  CustomFileExplorerSortingOptions,
} from "./types";

interface ArticleNavigationProperties {
  previous: string;
  next: string;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function firstReference(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const reference = firstReference(item);
      if (reference) return reference;
    }
    return undefined;
  }
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const wikiLink = trimmed.match(/!?\[\[([^\]]+)\]\]/)?.[1];
  const markdownLink = trimmed.match(/\[[^\]]*\]\(([^)]+)\)/)?.[1];
  let reference = (wikiLink ?? markdownLink ?? trimmed).trim();
  reference = reference.replace(/^<|>$/g, "").split("|")[0]?.split("#")[0]?.trim() ?? "";
  if (!reference || /^[a-z][a-z\d+.-]*:/i.test(reference)) return undefined;
  try {
    reference = decodeURIComponent(reference);
  } catch {
    // Keep the source text when it contains a literal percent sign.
  }
  return reference.replace(/\\/g, "/").replace(/^\/+/, "");
}

function comparablePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLocaleLowerCase();
}

function parentPath(slug: string): string {
  const separator = slug.lastIndexOf("/");
  return separator < 0 ? "" : slug.slice(0, separator);
}

function resolveReference(
  model: VaultModel,
  source: VaultFileRecord,
  value: unknown,
): VaultFileRecord | undefined {
  const reference = firstReference(value);
  if (!reference) return undefined;

  const withoutExtension = reference.replace(/\.(?:md|markdown)$/i, "");
  const sourceFolder = parentPath(source.slug);
  const relative = path.posix
    .normalize(path.posix.join(sourceFolder, withoutExtension))
    .replace(/^\.\//, "");
  const directCandidates = [relative, withoutExtension]
    .map((candidate) => normalizeCanonicalPath(candidate))
    .filter((candidate): candidate is string => candidate !== undefined);

  for (const candidate of directCandidates) {
    const exact = model.files.get(candidate) ?? model.files.get(`${candidate}/index`);
    if (exact) return exact;
    const insensitive = [...model.files.values()].find(
      (file) => comparablePath(file.slug) === comparablePath(candidate),
    );
    if (insensitive) return insensitive;
  }

  const basename = comparablePath(withoutExtension.split("/").at(-1) ?? withoutExtension);
  const matches = [...model.files.values()].filter(
    (file) => comparablePath(file.basename) === basename,
  );
  if (matches.length === 1) return matches[0];
  return matches.find((file) => parentPath(file.slug) === sourceFolder);
}

function pageTitle(file: VaultFileRecord): string {
  return nonEmptyString(ownValue(file.frontmatter, "title")) ?? file.basename;
}

export async function resolveArticleNavigationProperties(
  ctx: BuildCtx,
  options: CustomFileExplorerSortingOptions,
): Promise<ArticleNavigationProperties> {
  const fallback = {
    previous: options.previousArticleProperty,
    next: options.nextArticleProperty,
  };
  const contentDirectory = ctx.argv?.directory;
  if (typeof contentDirectory !== "string" || contentDirectory.trim().length === 0) return fallback;

  try {
    const settingsPath = path.resolve(
      contentDirectory,
      ".obsidian",
      "plugins",
      "article-navigator",
      "data.json",
    );
    const parsed = JSON.parse(await fs.readFile(settingsPath, "utf8")) as unknown;
    return {
      previous: nonEmptyString(ownValue(parsed, "previousKey")) ?? fallback.previous,
      next: nonEmptyString(ownValue(parsed, "nextKey")) ?? fallback.next,
    };
  } catch {
    return fallback;
  }
}

export function buildArticleNavigationManifest(
  allFiles: unknown,
  options: CustomFileExplorerSortingOptions,
  properties: ArticleNavigationProperties,
): ArticleNavigationManifest {
  const model = buildVaultModel(allFiles, options);
  const pages: Record<string, ArticleNavigationPage> = Object.create(null) as Record<
    string,
    ArticleNavigationPage
  >;

  for (const source of model.files.values()) {
    const previous = resolveReference(
      model,
      source,
      ownValue(source.frontmatter, properties.previous),
    );
    const next = resolveReference(model, source, ownValue(source.frontmatter, properties.next));
    if (!previous && !next) continue;

    pages[source.slug] = {
      ...(previous ? { previous: { slug: previous.slug, title: pageTitle(previous) } } : {}),
      ...(next ? { next: { slug: next.slug, title: pageTitle(next) } } : {}),
    };
  }

  return {
    previousProperty: properties.previous,
    nextProperty: properties.next,
    pages,
  };
}
