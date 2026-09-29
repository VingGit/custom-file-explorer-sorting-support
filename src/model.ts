import type { CustomFileExplorerSortingOptions } from "./types";

export interface VaultFileRecord {
  slug: string;
  sourcePath: string;
  fileName: string;
  basename: string;
  frontmatter: Record<string, unknown>;
  created: number;
  modified: number;
}

export interface VaultFolderRecord {
  canonicalPath: string;
  sourcePath: string;
  name: string;
  index?: VaultFileRecord;
  folderNote?: VaultFileRecord;
  directFiles: VaultFileRecord[];
  descendantFiles: VaultFileRecord[];
}

export interface SortingSpecSource {
  folderPath: string;
  fileName: string;
  text: string;
}

export interface VaultModel {
  files: Map<string, VaultFileRecord>;
  folders: Map<string, VaultFolderRecord>;
  specSources: SortingSpecSource[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

export function ownValue(value: unknown, key: string): unknown {
  if (!isRecord(value)) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function ownString(value: unknown, key: string): string | undefined {
  const item = ownValue(value, key);
  return typeof item === "string" && item.length > 0 ? item : undefined;
}

function normalizeSlashes(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/");
}

export function normalizeCanonicalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  let normalized = normalizeSlashes(value).replace(/^\/+|\/+$/g, "");
  if (normalized.length === 0) return undefined;
  normalized = normalized.replace(/\.(?:md|markdown|canvas|base)$/i, "");
  return normalized;
}

export function normalizeFolderPath(value: unknown): string {
  const normalized = normalizeCanonicalPath(value);
  if (!normalized || normalized === "index") return "/";
  return normalized.endsWith("/index") ? normalized.slice(0, -"/index".length) || "/" : normalized;
}

function sourcePathOf(value: unknown, slug: string): string {
  const raw = ownString(value, "relativePath") ?? ownString(value, "filePath") ?? `${slug}.md`;
  return normalizeSlashes(raw).replace(/^\/+/, "");
}

function fileNameOf(sourcePath: string): string {
  return sourcePath.split("/").at(-1) ?? sourcePath;
}

function basenameOf(fileName: string): string {
  return fileName.replace(/\.(?:md|markdown|canvas|base)$/i, "");
}

function toTimestamp(value: unknown): number | undefined {
  try {
    if (value instanceof Date) {
      const timestamp = Date.prototype.getTime.call(value);
      return Number.isFinite(timestamp) ? timestamp : undefined;
    }
  } catch {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : undefined;
  }
  return undefined;
}

function firstTimestamp(...values: unknown[]): number {
  for (const value of values) {
    const timestamp = toTimestamp(value);
    if (timestamp !== undefined) return timestamp;
  }
  return 0;
}

function toFileRecord(value: unknown): VaultFileRecord | undefined {
  const slug = normalizeCanonicalPath(ownValue(value, "slug"));
  if (!slug) return undefined;
  const sourcePath = sourcePathOf(value, slug);
  const fileName = fileNameOf(sourcePath);
  const frontmatterValue = ownValue(value, "frontmatter");
  const frontmatter = isRecord(frontmatterValue) ? frontmatterValue : {};
  const datesValue = ownValue(value, "dates");
  const dates = isRecord(datesValue) ? datesValue : {};

  return {
    slug,
    sourcePath,
    fileName,
    basename: basenameOf(fileName),
    frontmatter,
    created: firstTimestamp(
      ownValue(dates, "created"),
      ownValue(value, "created"),
      ownValue(frontmatter, "created"),
      ownValue(frontmatter, "date"),
    ),
    modified: firstTimestamp(
      ownValue(dates, "modified"),
      ownValue(value, "modified"),
      ownValue(value, "updated"),
      ownValue(frontmatter, "modified"),
      ownValue(frontmatter, "updated"),
      ownValue(frontmatter, "date"),
    ),
  };
}

function sourceDirectoryParts(file: VaultFileRecord): string[] {
  const parts = file.sourcePath.split("/").filter(Boolean);
  parts.pop();
  return parts;
}

function canonicalDirectoryParts(file: VaultFileRecord): string[] {
  const parts = file.slug.split("/").filter(Boolean);
  if (parts.at(-1) === "index") parts.pop();
  else parts.pop();
  return parts;
}

function ensureFolder(
  folders: Map<string, VaultFolderRecord>,
  canonicalParts: string[],
  sourceParts: string[],
  depth: number,
): VaultFolderRecord {
  const canonicalPath = canonicalParts.slice(0, depth).join("/") || "/";
  const existing = folders.get(canonicalPath);
  if (existing) return existing;
  const sourceSlice = sourceParts.slice(0, depth);
  const sourcePath = sourceSlice.join("/") || "/";
  const fallbackName = canonicalParts[depth - 1] ?? "";
  const folder: VaultFolderRecord = {
    canonicalPath,
    sourcePath,
    name: sourceSlice.at(-1) ?? fallbackName,
    directFiles: [],
    descendantFiles: [],
  };
  folders.set(canonicalPath, folder);
  return folder;
}

function safeArray(value: unknown): unknown[] {
  try {
    return Array.isArray(value) ? Array.from(value) : [];
  } catch {
    return [];
  }
}

export function buildVaultModel(
  values: unknown,
  options: CustomFileExplorerSortingOptions,
): VaultModel {
  const files = new Map<string, VaultFileRecord>();
  const folders = new Map<string, VaultFolderRecord>();
  folders.set("/", {
    canonicalPath: "/",
    sourcePath: "/",
    name: "",
    directFiles: [],
    descendantFiles: [],
  });

  for (const value of safeArray(values)) {
    const file = toFileRecord(value);
    if (!file || files.has(file.slug)) continue;
    files.set(file.slug, file);

    const canonicalParts = canonicalDirectoryParts(file);
    const sourceParts = sourceDirectoryParts(file);
    for (let depth = 1; depth <= canonicalParts.length; depth += 1) {
      ensureFolder(folders, canonicalParts, sourceParts, depth);
    }
  }

  for (const file of files.values()) {
    const canonicalParts = canonicalDirectoryParts(file);
    const parentPath = canonicalParts.join("/") || "/";
    const parent = folders.get(parentPath);
    if (!parent) continue;

    const isIndex = file.slug === "index" || file.slug.endsWith("/index");
    if (isIndex) parent.index ??= file;
    if (file.basename === parent.name) parent.folderNote ??= file;
    parent.directFiles.push(file);

    parent.descendantFiles.push(file);
    for (let depth = canonicalParts.length - 1; depth >= 0; depth -= 1) {
      const ancestorPath = canonicalParts.slice(0, depth).join("/") || "/";
      folders.get(ancestorPath)?.descendantFiles.push(file);
    }
  }

  const specSources: SortingSpecSource[] = [];
  for (const file of files.values()) {
    const rawSpec = ownValue(file.frontmatter, options.specProperty);
    if (rawSpec === undefined || rawSpec === null) continue;
    if (typeof rawSpec !== "string") {
      throw new Error(
        `${file.sourcePath}: frontmatter property "${options.specProperty}" must be a string`,
      );
    }
    const canonicalParts = canonicalDirectoryParts(file);
    const folder = folders.get(canonicalParts.join("/") || "/");
    specSources.push({
      folderPath: folder?.sourcePath ?? "/",
      fileName: file.fileName,
      text: rawSpec,
    });
  }
  specSources.sort(
    (left, right) =>
      left.folderPath.localeCompare(right.folderPath) ||
      left.fileName.localeCompare(right.fileName),
  );

  return { files, folders, specSources };
}

export function metadataForFolder(folder: VaultFolderRecord | undefined): Record<string, unknown> {
  if (!folder) return {};
  return {
    ...(folder.folderNote?.frontmatter ?? {}),
    ...(folder.index?.frontmatter ?? {}),
  };
}

export function sourceFolderPath(model: VaultModel, canonicalPath: string): string {
  return (
    model.folders.get(normalizeFolderPath(canonicalPath))?.sourcePath ??
    normalizeFolderPath(canonicalPath)
  );
}

export function sourceFolderName(model: VaultModel, canonicalPath: string): string {
  const normalized = normalizeFolderPath(canonicalPath);
  return (
    model.folders.get(normalized)?.name ??
    (normalized === "/" ? "" : (normalized.split("/").at(-1) ?? ""))
  );
}
