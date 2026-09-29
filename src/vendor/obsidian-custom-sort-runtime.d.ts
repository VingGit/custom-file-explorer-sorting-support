export type NormalizerFn = (value: string) => string | null;

export interface RegExpSpec {
  regex: RegExp;
  normalizerFn?: NormalizerFn;
}

export declare enum CustomSortGroupType {
  Outsiders,
  MatchAll,
  ExactName,
  ExactPrefix,
  ExactSuffix,
  ExactHeadAndTail,
  HasMetadataField,
  BookmarkedOnly,
  HasIcon,
}

export declare enum CustomSortOrder {
  alphabetical = 1,
  alphabeticalWithFileExt,
  trueAlphabetical,
  trueAlphabeticalWithFileExt,
  alphabeticalReverse,
  alphabeticalReverseWithFileExt,
  trueAlphabeticalReverse,
  trueAlphabeticalReverseWithFileExt,
  byModifiedTime,
  byModifiedTimeAdvanced,
  byModifiedTimeAdvancedRecursive,
  byModifiedTimeReverse,
  byModifiedTimeReverseAdvanced,
  byModifiedTimeReverseAdvancedRecursive,
  byCreatedTime,
  byCreatedTimeAdvanced,
  byCreatedTimeAdvancedRecursive,
  byCreatedTimeReverse,
  byCreatedTimeReverseAdvanced,
  byCreatedTimeReverseAdvancedRecursive,
  byMetadataFieldAlphabetical,
  byMetadataFieldTrueAlphabetical,
  byMetadataFieldAlphabeticalReverse,
  byMetadataFieldTrueAlphabeticalReverse,
  standardObsidian,
  byBookmarkOrder,
  byBookmarkOrderReverse,
  fileFirst,
  folderFirst,
  alphabeticalWithFilesPreferred,
  alphabeticalWithFoldersPreferred,
  vscUnicode,
  vscUnicodeReverse,
  vscUnicodeNatural,
  vscUnicodeNaturalReverse,
  default = alphabeticalWithFilesPreferred,
}

export interface CustomSort {
  order: CustomSortOrder;
  byMetadata?: string;
  metadataValueExtractor?: NormalizerFn;
}

export interface CustomSortGroup {
  type: CustomSortGroupType;
  exactText?: string;
  exactPrefix?: string;
  regexPrefix?: RegExpSpec;
  exactSuffix?: string;
  regexSuffix?: RegExpSpec;
  sorting?: CustomSort;
  secondarySorting?: CustomSort;
  filesOnly?: boolean;
  matchFilenameWithExt?: boolean;
  foldersOnly?: boolean;
  withMetadataFieldName?: string;
  iconName?: string;
  priority?: number;
  combineWithIdx?: number;
}

export interface CustomSortSpec {
  targetFoldersPaths: string[];
  defaultSorting?: CustomSort;
  defaultSecondarySorting?: CustomSort;
  groups: CustomSortGroup[];
  outsidersGroupIdx?: number;
  outsidersFilesGroupIdx?: number;
  outsidersFoldersGroupIdx?: number;
  itemsToHide?: Set<string>;
  priorityOrder?: number[];
  implicit?: boolean;
}

export interface WildcardSortSpecs {
  folderMatch(folderPath: string, folderName: string): CustomSortSpec | undefined;
}

export interface SortSpecsCollection {
  sortSpecByPath?: Record<string, CustomSortSpec>;
  sortSpecByName?: Record<string, CustomSortSpec>;
  sortSpecByWildcard?: WildcardSortSpecs;
}

export declare class SortingSpecProcessor {
  recentErrorMessage: string | null;
  constructor(errorLogger?: (...parts: unknown[]) => void);
  parseSortSpecFromText(
    text: string[],
    folderPath: string,
    sortingSpecFileName: string,
    collection?: SortSpecsCollection | null,
    implicitSpec?: boolean,
  ): SortSpecsCollection | null | undefined;
}

export declare const DEFAULT_METADATA_FIELD_FOR_SORTING: string;
