import type { Root as HtmlRoot } from "hast";
import type { PluggableList } from "unified";
import type { Data, VFile } from "vfile";

export type FilePath = string & { readonly _brand: "FilePath" };
export type FullSlug = string & { readonly _brand: "FullSlug" };

export interface QuartzConfiguration {
  configuration: Record<string, unknown>;
  plugins?: unknown;
  externalPlugins?: unknown;
}

export interface BuildCtx {
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

export type QuartzPluginData = Data;
export type ProcessedContent = [HtmlRoot, VFile];

export interface JavaScriptResource {
  loadTime: "beforeDOMReady" | "afterDOMReady";
  moduleType?: "module";
  spaPreserve?: boolean;
  contentType: "external" | "inline";
  src?: string;
  script?: string;
}

export interface StaticResources {
  css: Array<{ content: string; inline?: boolean; spaPreserve?: boolean }>;
  js: JavaScriptResource[];
  additionalHead: unknown[];
}

export interface ChangeEvent {
  type: "add" | "change" | "delete";
  path: FilePath;
  file?: VFile;
}

export interface QuartzTransformerPluginInstance {
  name: string;
  textTransform?: (ctx: BuildCtx, src: string) => string;
  markdownPlugins?: (ctx: BuildCtx) => PluggableList;
  htmlPlugins?: (ctx: BuildCtx) => PluggableList;
  externalResources?: (ctx: BuildCtx) => Partial<StaticResources> | undefined;
}

export interface QuartzEmitterPluginInstance {
  name: string;
  emit(
    ctx: BuildCtx,
    content: ProcessedContent[],
    resources: StaticResources,
  ): Promise<FilePath[]> | AsyncGenerator<FilePath>;
  partialEmit?(
    ctx: BuildCtx,
    content: ProcessedContent[],
    resources: StaticResources,
    changeEvents: ChangeEvent[],
  ): Promise<FilePath[]> | AsyncGenerator<FilePath> | null;
  externalResources?: (ctx: BuildCtx) => Partial<StaticResources> | undefined;
}

export type QuartzTransformerPlugin<Options extends object | undefined = undefined> = (
  options?: Options,
) => QuartzTransformerPluginInstance;

export type QuartzEmitterPlugin<Options extends object | undefined = undefined> = (
  options?: Options,
) => QuartzEmitterPluginInstance;
