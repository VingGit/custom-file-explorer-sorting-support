export type {
  BuildCtx,
  ChangeEvent,
  FilePath,
  ProcessedContent,
  QuartzEmitterPlugin,
  QuartzEmitterPluginInstance,
  QuartzPluginData,
  QuartzTransformerPlugin,
  QuartzTransformerPluginInstance,
  StaticResources,
} from "./quartz";

export interface CustomFileExplorerSortingOptions {
  /** Frontmatter property containing SebastianMC's sorting specification. */
  specProperty: string;
  /** Numeric frontmatter property used as Quartz's bookmark-order equivalent. */
  bookmarksOrderProperty: string;
  /** Frontmatter property used by `with-icon:` groups. */
  iconProperty: string;
}

export interface QuartzSortInput<T = unknown> {
  /** Opaque caller value returned after sorting. */
  value: T;
  /** Canonical Quartz path without a trailing `/index`. */
  path: string;
  isFolder: boolean;
}

export interface QuartzSortResult<T = unknown> {
  matched: boolean;
  items: T[];
}

export interface QuartzNavigationSortingService {
  readonly apiVersion: 1;
  sort<T>(
    folderPath: string,
    items: readonly QuartzSortInput<T>[],
    allFiles: unknown,
  ): QuartzSortResult<T>;
}

export interface ExplorerOrderManifest {
  version: 1;
  folders: Record<
    string,
    {
      order: string[];
      hidden: string[];
    }
  >;
}

export const SORTING_SERVICE_SYMBOL = "@vinggit/custom-file-explorer-sorting-support/service/v1";
export const EXPLORER_MANIFEST_PATH = "static/custom-file-explorer-sorting.json";
