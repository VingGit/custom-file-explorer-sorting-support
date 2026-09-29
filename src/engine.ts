import {
  CustomSortGroupType,
  CustomSortOrder,
  DEFAULT_METADATA_FIELD_FOR_SORTING,
  SortingSpecProcessor,
} from "./vendor/obsidian-custom-sort-runtime.js";
import type {
  CustomSort,
  CustomSortGroup,
  CustomSortSpec,
  NormalizerFn,
  RegExpSpec,
  SortSpecsCollection,
} from "./vendor/obsidian-custom-sort-runtime.js";

import {
  buildVaultModel,
  metadataForFolder,
  normalizeFolderPath,
  ownValue,
  sourceFolderName,
  sourceFolderPath,
  type VaultFileRecord,
  type VaultModel,
} from "./model";
import type {
  CustomFileExplorerSortingOptions,
  ExplorerOrderManifest,
  QuartzNavigationSortingService,
  QuartzSortInput,
  QuartzSortResult,
} from "./types";

const naturalCompare = new Intl.Collator(undefined, {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
}).compare;
const trueAlphabeticalCompare = new Intl.Collator(undefined, {
  usage: "sort",
  sensitivity: "base",
  numeric: false,
}).compare;
const vscNaturalCompare = new Intl.Collator("en", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
}).compare;

enum SortLevel {
  Primary,
  Secondary,
  DerivedPrimary,
  DerivedSecondary,
}

interface SortableItem<T> {
  value: T;
  path: string;
  name: string;
  nameWithExtension: string;
  isFolder: boolean;
  metadata: Record<string, unknown>;
  children: readonly VaultFileRecord[];
  descendants: readonly VaultFileRecord[];
  created: number;
  modified: number;
  groupIndex?: number;
  sortString: string;
  sortStringWithExtension: string;
  primaryMetadata?: string;
  secondaryMetadata?: string;
  derivedPrimaryMetadata?: string;
  derivedSecondaryMetadata?: string;
  bookmarkOrder?: number;
  originalIndex: number;
}

export const defaultOptions: CustomFileExplorerSortingOptions = Object.freeze({
  specProperty: "sorting-spec",
  bookmarksOrderProperty: "bookmarks-order",
  iconProperty: "icon",
});

export function normalizeOptions(value: unknown): CustomFileExplorerSortingOptions {
  const normalizeKey = (key: keyof CustomFileExplorerSortingOptions): string => {
    const candidate = ownValue(value, key);
    return typeof candidate === "string" && candidate.trim().length > 0
      ? candidate.trim()
      : defaultOptions[key];
  };
  return {
    specProperty: normalizeKey("specProperty"),
    bookmarksOrderProperty: normalizeKey("bookmarksOrderProperty"),
    iconProperty: normalizeKey("iconProperty"),
  };
}

function compileSpecs(model: VaultModel): SortSpecsCollection | undefined {
  if (model.specSources.length === 0) return undefined;
  const errors: string[] = [];
  const processor = new SortingSpecProcessor((...parts: unknown[]) => {
    errors.push(parts.map(String).join(" "));
  });
  let collection: SortSpecsCollection | null | undefined;

  for (const source of model.specSources) {
    collection = processor.parseSortSpecFromText(
      source.text.split(/\r?\n/),
      source.folderPath,
      source.fileName,
      collection,
    );
    if (!collection) {
      const detail = processor.recentErrorMessage ?? errors.at(-1) ?? "Unknown parser error";
      throw new Error(`Invalid Custom File Explorer sorting specification.\n${detail}`);
    }
  }
  return collection ?? undefined;
}

function resolveSpec(
  collection: SortSpecsCollection | undefined,
  model: VaultModel,
  canonicalFolderPath: string,
): CustomSortSpec | undefined {
  if (!collection) return undefined;
  const folderPath = sourceFolderPath(model, canonicalFolderPath);
  const folderName = sourceFolderName(model, canonicalFolderPath);
  return (
    collection.sortSpecByPath?.[folderPath] ??
    collection.sortSpecByName?.[folderName] ??
    collection.sortSpecByWildcard?.folderMatch(folderPath, folderName) ??
    undefined
  );
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return String(value);
  } catch {
    return undefined;
  }
}

function metadataValue(
  metadata: Record<string, unknown>,
  field: string,
  extractor?: (value: string) => string | null,
): string | undefined {
  const value = stringValue(ownValue(metadata, field));
  if (value === undefined) return undefined;
  return extractor ? (extractor(value) ?? undefined) : value;
}

function bookmarkOrder(
  metadata: Record<string, unknown>,
  options: CustomFileExplorerSortingOptions,
): number | undefined {
  const raw = ownValue(metadata, options.bookmarksOrderProperty);
  const numeric = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function iconName(
  metadata: Record<string, unknown>,
  options: CustomFileExplorerSortingOptions,
): string | undefined {
  const direct = ownValue(metadata, options.iconProperty);
  if (typeof direct === "string" && direct.length > 0) return direct;
  const panel = ownValue(metadata, "panel");
  const panelIcon = ownValue(panel, options.iconProperty);
  return typeof panelIcon === "string" && panelIcon.length > 0 ? panelIcon : undefined;
}

function regexMatch(
  expression: RegExpSpec,
  value: string,
): [matched: boolean, normalized?: string, fullMatch?: string] {
  expression.regex.lastIndex = 0;
  const match = expression.regex.exec(value);
  if (!match) return [false];
  const captured = match[1];
  const normalized = captured
    ? expression.normalizerFn
      ? (expression.normalizerFn(captured) ?? undefined)
      : captured
    : undefined;
  return [true, normalized, match[0]];
}

function expandMacro(value: string | undefined, folderName: string): string | undefined {
  return folderName ? value?.replace("{:%parent-folder-name%:}", folderName) : value;
}

function folderGroups(spec: CustomSortSpec, folderName: string): CustomSortGroup[] {
  return spec.groups.map((group) => ({
    ...group,
    exactText: expandMacro(group.exactText, folderName),
    exactPrefix: expandMacro(group.exactPrefix, folderName),
    exactSuffix: expandMacro(group.exactSuffix, folderName),
  }));
}

function isMetadataSort(order: CustomSortOrder | undefined): boolean {
  return (
    order === CustomSortOrder.byMetadataFieldAlphabetical ||
    order === CustomSortOrder.byMetadataFieldTrueAlphabetical ||
    order === CustomSortOrder.byMetadataFieldAlphabeticalReverse ||
    order === CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse
  );
}

function selectedMetadata(item: SortableItem<unknown>, level: SortLevel): string | undefined {
  if (level === SortLevel.Secondary) return item.secondaryMetadata;
  if (level === SortLevel.DerivedPrimary) return item.derivedPrimaryMetadata;
  if (level === SortLevel.DerivedSecondary) return item.derivedSecondaryMetadata;
  return item.primaryMetadata;
}

function metadataComparator(
  reverse: boolean,
  trueAlphabetical: boolean,
  level: SortLevel,
): (left: SortableItem<unknown>, right: SortableItem<unknown>) => number {
  const compare = trueAlphabetical ? trueAlphabeticalCompare : naturalCompare;
  return (initialLeft, initialRight) => {
    const left = reverse ? initialRight : initialLeft;
    const right = reverse ? initialLeft : initialRight;
    const leftValue = selectedMetadata(left, level);
    const rightValue = selectedMetadata(right, level);
    if (leftValue !== undefined && rightValue !== undefined) return compare(leftValue, rightValue);
    if (leftValue !== undefined) return reverse ? 1 : -1;
    if (rightValue !== undefined) return reverse ? -1 : 1;
    return 0;
  };
}

function datedComparator(
  field: "created" | "modified",
  reverse: boolean,
): (left: SortableItem<unknown>, right: SortableItem<unknown>) => number {
  return (initialLeft, initialRight) => {
    const left = reverse ? initialRight : initialLeft;
    const right = reverse ? initialLeft : initialRight;
    const leftValue = left[field];
    const rightValue = right[field];
    if (leftValue && rightValue) return leftValue - rightValue;
    if (leftValue) return reverse ? 1 : -1;
    if (rightValue) return reverse ? -1 : 1;
    return 0;
  };
}

function standardComparator(left: SortableItem<unknown>, right: SortableItem<unknown>): number {
  if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
  return naturalCompare(left.sortString, right.sortString);
}

function comparatorFor(
  order: CustomSortOrder,
  level: SortLevel,
): (left: SortableItem<unknown>, right: SortableItem<unknown>) => number {
  switch (order) {
    case CustomSortOrder.alphabetical:
      return (left, right) => naturalCompare(left.sortString, right.sortString);
    case CustomSortOrder.alphabeticalWithFilesPreferred:
    case CustomSortOrder.alphabeticalWithFoldersPreferred:
      return (left, right) =>
        naturalCompare(left.sortString, right.sortString) ||
        (left.isFolder === right.isFolder ? 0 : left.isFolder ? 1 : -1);
    case CustomSortOrder.alphabeticalWithFileExt:
      return (left, right) =>
        naturalCompare(left.sortStringWithExtension, right.sortStringWithExtension);
    case CustomSortOrder.trueAlphabetical:
      return (left, right) => trueAlphabeticalCompare(left.sortString, right.sortString);
    case CustomSortOrder.trueAlphabeticalWithFileExt:
      return (left, right) =>
        trueAlphabeticalCompare(left.sortStringWithExtension, right.sortStringWithExtension);
    case CustomSortOrder.alphabeticalReverse:
      return (left, right) => naturalCompare(right.sortString, left.sortString);
    case CustomSortOrder.alphabeticalReverseWithFileExt:
      return (left, right) =>
        naturalCompare(right.sortStringWithExtension, left.sortStringWithExtension);
    case CustomSortOrder.trueAlphabeticalReverse:
      return (left, right) => trueAlphabeticalCompare(right.sortString, left.sortString);
    case CustomSortOrder.trueAlphabeticalReverseWithFileExt:
      return (left, right) =>
        trueAlphabeticalCompare(right.sortStringWithExtension, left.sortStringWithExtension);
    case CustomSortOrder.byModifiedTime:
      return (left, right) =>
        left.isFolder && right.isFolder
          ? naturalCompare(left.sortString, right.sortString)
          : left.modified - right.modified;
    case CustomSortOrder.byModifiedTimeReverse:
      return (left, right) =>
        left.isFolder && right.isFolder
          ? naturalCompare(left.sortString, right.sortString)
          : right.modified - left.modified;
    case CustomSortOrder.byCreatedTime:
      return (left, right) =>
        left.isFolder && right.isFolder
          ? naturalCompare(left.sortString, right.sortString)
          : left.created - right.created;
    case CustomSortOrder.byCreatedTimeReverse:
      return (left, right) =>
        left.isFolder && right.isFolder
          ? naturalCompare(left.sortString, right.sortString)
          : right.created - left.created;
    case CustomSortOrder.byModifiedTimeAdvanced:
    case CustomSortOrder.byModifiedTimeAdvancedRecursive:
      return datedComparator("modified", false);
    case CustomSortOrder.byModifiedTimeReverseAdvanced:
    case CustomSortOrder.byModifiedTimeReverseAdvancedRecursive:
      return datedComparator("modified", true);
    case CustomSortOrder.byCreatedTimeAdvanced:
    case CustomSortOrder.byCreatedTimeAdvancedRecursive:
      return datedComparator("created", false);
    case CustomSortOrder.byCreatedTimeReverseAdvanced:
    case CustomSortOrder.byCreatedTimeReverseAdvancedRecursive:
      return datedComparator("created", true);
    case CustomSortOrder.byMetadataFieldAlphabetical:
      return metadataComparator(false, false, level);
    case CustomSortOrder.byMetadataFieldTrueAlphabetical:
      return metadataComparator(false, true, level);
    case CustomSortOrder.byMetadataFieldAlphabeticalReverse:
      return metadataComparator(true, false, level);
    case CustomSortOrder.byMetadataFieldTrueAlphabeticalReverse:
      return metadataComparator(true, true, level);
    case CustomSortOrder.byBookmarkOrder:
      return (left, right) =>
        left.bookmarkOrder !== undefined && right.bookmarkOrder !== undefined
          ? left.bookmarkOrder - right.bookmarkOrder
          : left.bookmarkOrder !== undefined
            ? -1
            : right.bookmarkOrder !== undefined
              ? 1
              : 0;
    case CustomSortOrder.byBookmarkOrderReverse:
      return (left, right) =>
        left.bookmarkOrder !== undefined && right.bookmarkOrder !== undefined
          ? right.bookmarkOrder - left.bookmarkOrder
          : left.bookmarkOrder !== undefined
            ? 1
            : right.bookmarkOrder !== undefined
              ? -1
              : 0;
    case CustomSortOrder.fileFirst:
      return (left, right) => (left.isFolder === right.isFolder ? 0 : left.isFolder ? 1 : -1);
    case CustomSortOrder.folderFirst:
      return (left, right) => (left.isFolder === right.isFolder ? 0 : left.isFolder ? -1 : 1);
    case CustomSortOrder.vscUnicode:
      return (left, right) =>
        left.sortString === right.sortString ? 0 : left.sortString < right.sortString ? -1 : 1;
    case CustomSortOrder.vscUnicodeReverse:
      return (left, right) =>
        left.sortString === right.sortString ? 0 : right.sortString < left.sortString ? -1 : 1;
    case CustomSortOrder.vscUnicodeNatural:
      return (left, right) =>
        vscNaturalCompare(left.sortStringWithExtension, right.sortStringWithExtension);
    case CustomSortOrder.vscUnicodeNaturalReverse:
      return (left, right) =>
        vscNaturalCompare(right.sortStringWithExtension, left.sortStringWithExtension);
    case CustomSortOrder.standardObsidian:
      return standardComparator;
    default:
      return (left, right) =>
        naturalCompare(left.sortString, right.sortString) ||
        (left.isFolder === right.isFolder ? 0 : left.isFolder ? 1 : -1);
  }
}

function isRecursiveDateOrder(order: CustomSortOrder | undefined): boolean {
  return (
    order === CustomSortOrder.byModifiedTimeAdvancedRecursive ||
    order === CustomSortOrder.byModifiedTimeReverseAdvancedRecursive ||
    order === CustomSortOrder.byCreatedTimeAdvancedRecursive ||
    order === CustomSortOrder.byCreatedTimeReverseAdvancedRecursive
  );
}

function isAdvancedDateOrder(order: CustomSortOrder | undefined): boolean {
  return (
    isRecursiveDateOrder(order) ||
    order === CustomSortOrder.byModifiedTimeAdvanced ||
    order === CustomSortOrder.byModifiedTimeReverseAdvanced ||
    order === CustomSortOrder.byCreatedTimeAdvanced ||
    order === CustomSortOrder.byCreatedTimeReverseAdvanced
  );
}

function folderDates(files: readonly VaultFileRecord[]): { created: number; modified: number } {
  let created = 0;
  let modified = 0;
  for (const file of files) {
    if (file.created && (!created || file.created < created)) created = file.created;
    if (file.modified > modified) modified = file.modified;
  }
  return { created, modified };
}

function sortingMetadata(
  sorting: CustomSort | undefined,
  fallbackField: string | undefined,
  metadata: Record<string, unknown>,
): string | undefined {
  if (!sorting || !isMetadataSort(sorting.order)) return undefined;
  return metadataValue(
    metadata,
    sorting.byMetadata ?? fallbackField ?? DEFAULT_METADATA_FIELD_FOR_SORTING,
    sorting.metadataValueExtractor,
  );
}

function matchesGroup(
  item: SortableItem<unknown>,
  group: CustomSortGroup,
  options: CustomFileExplorerSortingOptions,
): { matched: boolean; derived?: string } {
  if (group.foldersOnly && !item.isFolder) return { matched: false };
  if (group.filesOnly && item.isFolder) return { matched: false };
  const value = group.matchFilenameWithExt ? item.nameWithExtension : item.name;

  switch (group.type) {
    case CustomSortGroupType.ExactPrefix:
      if (group.exactPrefix !== undefined) return { matched: value.startsWith(group.exactPrefix) };
      if (group.regexPrefix) {
        const [matched, derived] = regexMatch(group.regexPrefix, value);
        return { matched, derived };
      }
      return { matched: false };
    case CustomSortGroupType.ExactSuffix:
      if (group.exactSuffix !== undefined) return { matched: value.endsWith(group.exactSuffix) };
      if (group.regexSuffix) {
        const [matched, derived] = regexMatch(group.regexSuffix, value);
        return { matched, derived };
      }
      return { matched: false };
    case CustomSortGroupType.ExactHeadAndTail: {
      if (group.exactPrefix !== undefined && group.exactSuffix !== undefined) {
        return {
          matched:
            value.length >= group.exactPrefix.length + group.exactSuffix.length &&
            value.startsWith(group.exactPrefix) &&
            value.endsWith(group.exactSuffix),
        };
      }
      const [leftMatch, leftDerived, leftFull] = group.regexPrefix
        ? regexMatch(group.regexPrefix, value)
        : ([value.startsWith(group.exactPrefix ?? ""), undefined, group.exactPrefix] as const);
      const [rightMatch, rightDerived, rightFull] = group.regexSuffix
        ? regexMatch(group.regexSuffix, value)
        : ([value.endsWith(group.exactSuffix ?? ""), undefined, group.exactSuffix] as const);
      const matched =
        leftMatch &&
        rightMatch &&
        (leftFull?.length ?? 0) + (rightFull?.length ?? 0) <= value.length;
      return {
        matched,
        derived: matched ? `${leftDerived ?? ""}${rightDerived ?? ""}` || undefined : undefined,
      };
    }
    case CustomSortGroupType.ExactName:
      if (group.exactText !== undefined) return { matched: value === group.exactText };
      if (group.regexPrefix) {
        const [matched, derived] = regexMatch(group.regexPrefix, value);
        return { matched, derived };
      }
      return { matched: false };
    case CustomSortGroupType.HasMetadataField:
      return {
        matched:
          group.withMetadataFieldName !== undefined &&
          Object.prototype.hasOwnProperty.call(item.metadata, group.withMetadataFieldName),
      };
    case CustomSortGroupType.BookmarkedOnly:
      return { matched: bookmarkOrder(item.metadata, options) !== undefined };
    case CustomSortGroupType.HasIcon: {
      const icon = iconName(item.metadata, options);
      return { matched: icon !== undefined && (!group.iconName || icon === group.iconName) };
    }
    case CustomSortGroupType.MatchAll:
      return { matched: true };
    case CustomSortGroupType.Outsiders:
      return { matched: false };
  }
}

function applyGroup(
  item: SortableItem<unknown>,
  spec: CustomSortSpec,
  groups: CustomSortGroup[],
  options: CustomFileExplorerSortingOptions,
): void {
  const indexes = spec.priorityOrder ?? groups.map((_, index) => index);
  let groupIndex: number | undefined;
  let derived: string | undefined;

  for (const index of indexes) {
    const group = groups[index];
    if (!group || group.type === CustomSortGroupType.Outsiders) continue;
    const result = matchesGroup(item, group, options);
    if (!result.matched) continue;
    groupIndex = group.combineWithIdx ?? index;
    derived = result.derived;
    break;
  }

  if (groupIndex === undefined) {
    groupIndex = item.isFolder
      ? (spec.outsidersFoldersGroupIdx ?? spec.outsidersGroupIdx)
      : (spec.outsidersFilesGroupIdx ?? spec.outsidersGroupIdx);
  }
  groupIndex ??= groups.length;
  item.groupIndex = groupIndex;
  if (derived) {
    item.sortString = `${derived}//${item.name}`;
    item.sortStringWithExtension = `${derived}//${item.nameWithExtension}`;
  }

  const group = groups[groupIndex];
  item.bookmarkOrder = bookmarkOrder(item.metadata, options);
  item.primaryMetadata = sortingMetadata(
    group?.sorting,
    group?.withMetadataFieldName,
    item.metadata,
  );
  item.secondaryMetadata = sortingMetadata(
    group?.secondarySorting,
    group?.withMetadataFieldName,
    item.metadata,
  );
  item.derivedPrimaryMetadata = sortingMetadata(spec.defaultSorting, undefined, item.metadata);
  item.derivedSecondaryMetadata = sortingMetadata(
    spec.defaultSecondarySorting,
    undefined,
    item.metadata,
  );

  if (item.isFolder) {
    const orders = [
      group?.sorting?.order,
      group?.secondarySorting?.order,
      spec.defaultSorting?.order,
      spec.defaultSecondarySorting?.order,
    ];
    if (orders.some(isAdvancedDateOrder)) {
      const dates = folderDates(
        orders.some(isRecursiveDateOrder) ? item.descendants : item.children,
      );
      item.created = dates.created;
      item.modified = dates.modified;
    }
  }
}

function compareItems(
  left: SortableItem<unknown>,
  right: SortableItem<unknown>,
  spec: CustomSortSpec,
  groups: CustomSortGroup[],
): number {
  if (left.groupIndex !== right.groupIndex) return (left.groupIndex ?? 0) - (right.groupIndex ?? 0);
  const group = groups[left.groupIndex ?? -1];
  const stages: Array<[CustomSort | undefined, SortLevel]> = [
    [group?.sorting, SortLevel.Primary],
    [group?.secondarySorting, SortLevel.Secondary],
    [spec.defaultSorting, SortLevel.DerivedPrimary],
    [spec.defaultSecondarySorting, SortLevel.DerivedSecondary],
  ];
  for (const [sorting, level] of stages) {
    if (!sorting) continue;
    const result = comparatorFor(sorting.order, level)(left, right);
    if (result !== 0) return result;
  }
  return (
    comparatorFor(CustomSortOrder.default, SortLevel.Primary)(left, right) ||
    left.originalIndex - right.originalIndex
  );
}

function fileForPath(model: VaultModel, path: string): VaultFileRecord | undefined {
  return model.files.get(path) ?? model.files.get(`${path}/index`);
}

function toSortable<T>(
  input: QuartzSortInput<T>,
  index: number,
  model: VaultModel,
): SortableItem<T> {
  const normalizedPath = normalizeFolderPath(input.path);
  const folder = input.isFolder ? model.folders.get(normalizedPath) : undefined;
  const file = input.isFolder
    ? (folder?.index ?? folder?.folderNote)
    : fileForPath(model, input.path);
  const fallbackName =
    normalizedPath === "/" ? "" : (normalizedPath.split("/").filter(Boolean).at(-1) ?? "");
  const name = input.isFolder ? (folder?.name ?? fallbackName) : (file?.basename ?? fallbackName);
  const metadata = input.isFolder ? metadataForFolder(folder) : (file?.frontmatter ?? {});
  return {
    value: input.value,
    path: input.path,
    name,
    nameWithExtension: input.isFolder ? name : (file?.fileName ?? name),
    isFolder: input.isFolder,
    metadata,
    children: folder?.directFiles ?? [],
    descendants: folder?.descendantFiles ?? [],
    created: input.isFolder ? 0 : (file?.created ?? 0),
    modified: input.isFolder ? 0 : (file?.modified ?? 0),
    sortString: name,
    sortStringWithExtension: input.isFolder ? name : (file?.fileName ?? name),
    originalIndex: index,
  };
}

interface CompiledModel {
  model: VaultModel;
  collection: SortSpecsCollection | undefined;
}

function compileModel(allFiles: unknown, options: CustomFileExplorerSortingOptions): CompiledModel {
  const model = buildVaultModel(allFiles, options);
  return { model, collection: compileSpecs(model) };
}

function sortWithCompiledModel<T>(
  compiled: CompiledModel,
  folderPath: string,
  inputs: readonly QuartzSortInput<T>[],
  options: CustomFileExplorerSortingOptions,
): QuartzSortResult<T> {
  const spec = resolveSpec(compiled.collection, compiled.model, folderPath);
  if (!spec) return { matched: false, items: inputs.map((input) => input.value) };
  const groups = folderGroups(spec, sourceFolderName(compiled.model, folderPath));
  const hidden = spec.itemsToHide;
  const sortable = inputs
    .map((input, index) => toSortable(input, index, compiled.model))
    .filter((item) => !hidden?.has(item.nameWithExtension));
  for (const item of sortable) applyGroup(item, spec, groups, options);
  sortable.sort((left, right) => compareItems(left, right, spec, groups));
  return { matched: true, items: sortable.map((item) => item.value) };
}

export function createSortingService(
  userOptions: unknown = undefined,
): QuartzNavigationSortingService {
  const options = normalizeOptions(userOptions);
  const cache = new WeakMap<object, CompiledModel>();

  const getCompiled = (allFiles: unknown): CompiledModel => {
    if (typeof allFiles !== "object" || allFiles === null) return compileModel([], options);
    const cached = cache.get(allFiles);
    if (cached) return cached;
    const compiled = compileModel(allFiles, options);
    cache.set(allFiles, compiled);
    return compiled;
  };

  return Object.freeze({
    apiVersion: 1 as const,
    sort<T>(
      folderPath: string,
      items: readonly QuartzSortInput<T>[],
      allFiles: unknown,
    ): QuartzSortResult<T> {
      return sortWithCompiledModel(getCompiled(allFiles), folderPath, items, options);
    },
  });
}

interface ManifestEntry {
  key: string;
  path: string;
  isFolder: boolean;
}

function parentPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/") || "/";
}

export function buildExplorerOrderManifest(
  allFiles: unknown,
  userOptions: unknown = undefined,
): ExplorerOrderManifest {
  const options = normalizeOptions(userOptions);
  const compiled = compileModel(allFiles, options);
  const children = new Map<string, ManifestEntry[]>();
  const add = (folderPath: string, entry: ManifestEntry) => {
    const list = children.get(folderPath) ?? [];
    list.push(entry);
    children.set(folderPath, list);
  };

  for (const folder of compiled.model.folders.values()) {
    if (folder.canonicalPath === "/") continue;
    add(parentPath(folder.canonicalPath), {
      key: `folder:${folder.canonicalPath}`,
      path: folder.canonicalPath,
      isFolder: true,
    });
  }
  for (const file of compiled.model.files.values()) {
    if (file.slug === "index" || file.slug.endsWith("/index")) continue;
    add(parentPath(file.slug), {
      key: `file:${file.slug}`,
      path: file.slug,
      isFolder: false,
    });
  }

  const folders: ExplorerOrderManifest["folders"] = Object.create(
    null,
  ) as ExplorerOrderManifest["folders"];
  for (const [folderPath, entries] of children) {
    const result = sortWithCompiledModel(
      compiled,
      folderPath,
      entries.map((entry) => ({ value: entry, path: entry.path, isFolder: entry.isFolder })),
      options,
    );
    if (!result.matched) continue;
    const visible = new Set(result.items.map((entry) => entry.key));
    folders[folderPath] = {
      order: result.items.map((entry) => entry.key),
      hidden: entries.filter((entry) => !visible.has(entry.key)).map((entry) => entry.key),
    };
  }
  return { version: 1, folders };
}

export function validateSortingSpecifications(
  allFiles: unknown,
  userOptions: unknown = undefined,
): void {
  compileModel(allFiles, normalizeOptions(userOptions));
}

export type { CustomSortSpec, CustomSortGroup, CustomSortOrder, NormalizerFn };
