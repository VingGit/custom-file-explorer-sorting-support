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
  /** Replace navigation-only backlinks with Previous and Next article cards. */
  articleNavigation: boolean;
  /** Fallback property used when Article Navigator settings cannot be detected. */
  previousArticleProperty: string;
  /** Fallback property used when Article Navigator settings cannot be detected. */
  nextArticleProperty: string;
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
  articleNavigation?: ArticleNavigationManifest;
}

export interface ArticleNavigationLink {
  slug: string;
  title: string;
}

export interface ArticleNavigationPage {
  previous?: ArticleNavigationLink;
  next?: ArticleNavigationLink;
  /** Previous/next targets that are also linked intentionally in the Markdown body. */
  contentLinks?: string[];
}

export interface ArticleNavigationManifest {
  previousProperty: string;
  nextProperty: string;
  pages: Record<string, ArticleNavigationPage>;
}

export const SORTING_SERVICE_SYMBOL = "obsidian-material-plugins/navigation-sorting/v1";
export const EXPLORER_MANIFEST_PATH = "static/custom-file-explorer-sorting.json";
