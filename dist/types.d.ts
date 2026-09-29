import { Root } from 'hast';
import { PluggableList } from 'unified';
import { VFile, Data } from 'vfile';

type FilePath = string & {
    readonly _brand: "FilePath";
};
type FullSlug = string & {
    readonly _brand: "FullSlug";
};
interface QuartzConfiguration {
    configuration: Record<string, unknown>;
    plugins?: unknown;
    externalPlugins?: unknown;
}
interface BuildCtx {
    buildId: string;
    argv: {
        directory: string;
        output: string;
        verbose: boolean;
        serve: boolean;
        watch: boolean;
        port: number;
        wsPort: number;
        remoteDevHost?: string;
        concurrency?: number;
    };
    cfg: QuartzConfiguration;
    allSlugs: FullSlug[];
    allFiles: FilePath[];
    incremental: boolean;
}
type QuartzPluginData = Data;
type ProcessedContent = [Root, VFile];
interface JavaScriptResource {
    loadTime: "beforeDOMReady" | "afterDOMReady";
    moduleType?: "module";
    spaPreserve?: boolean;
    contentType: "external" | "inline";
    src?: string;
    script?: string;
}
interface StaticResources {
    css: Array<{
        content: string;
        inline?: boolean;
        spaPreserve?: boolean;
    }>;
    js: JavaScriptResource[];
    additionalHead: unknown[];
}
interface ChangeEvent {
    type: "add" | "change" | "delete";
    path: FilePath;
    file?: VFile;
}
interface QuartzTransformerPluginInstance {
    name: string;
    textTransform?: (ctx: BuildCtx, src: string) => string;
    markdownPlugins?: (ctx: BuildCtx) => PluggableList;
    htmlPlugins?: (ctx: BuildCtx) => PluggableList;
    externalResources?: (ctx: BuildCtx) => Partial<StaticResources> | undefined;
}
interface QuartzEmitterPluginInstance {
    name: string;
    emit(ctx: BuildCtx, content: ProcessedContent[], resources: StaticResources): Promise<FilePath[]> | AsyncGenerator<FilePath>;
    partialEmit?(ctx: BuildCtx, content: ProcessedContent[], resources: StaticResources, changeEvents: ChangeEvent[]): Promise<FilePath[]> | AsyncGenerator<FilePath> | null;
    externalResources?: (ctx: BuildCtx) => Partial<StaticResources> | undefined;
}
type QuartzTransformerPlugin<Options extends object | undefined = undefined> = (options?: Options) => QuartzTransformerPluginInstance;
type QuartzEmitterPlugin<Options extends object | undefined = undefined> = (options?: Options) => QuartzEmitterPluginInstance;

interface CustomFileExplorerSortingOptions {
    /** Frontmatter property containing SebastianMC's sorting specification. */
    specProperty: string;
    /** Numeric frontmatter property used as Quartz's bookmark-order equivalent. */
    bookmarksOrderProperty: string;
    /** Frontmatter property used by `with-icon:` groups. */
    iconProperty: string;
}
interface QuartzSortInput<T = unknown> {
    /** Opaque caller value returned after sorting. */
    value: T;
    /** Canonical Quartz path without a trailing `/index`. */
    path: string;
    isFolder: boolean;
}
interface QuartzSortResult<T = unknown> {
    matched: boolean;
    items: T[];
}
interface QuartzNavigationSortingService {
    readonly apiVersion: 1;
    sort<T>(folderPath: string, items: readonly QuartzSortInput<T>[], allFiles: unknown): QuartzSortResult<T>;
}
interface ExplorerOrderManifest {
    version: 1;
    folders: Record<string, {
        order: string[];
        hidden: string[];
    }>;
}
declare const SORTING_SERVICE_SYMBOL = "@vinggit/custom-file-explorer-sorting-support/service/v1";
declare const EXPLORER_MANIFEST_PATH = "static/custom-file-explorer-sorting.json";

export { type BuildCtx, type ChangeEvent, type CustomFileExplorerSortingOptions, EXPLORER_MANIFEST_PATH, type ExplorerOrderManifest, type FilePath, type ProcessedContent, type QuartzEmitterPlugin, type QuartzEmitterPluginInstance, type QuartzNavigationSortingService, type QuartzPluginData, type QuartzSortInput, type QuartzSortResult, type QuartzTransformerPlugin, type QuartzTransformerPluginInstance, SORTING_SERVICE_SYMBOL, type StaticResources };
