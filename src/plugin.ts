import fs from "node:fs/promises";
import path from "node:path";

import type { BuildCtx, FilePath, ProcessedContent, QuartzEmitterPluginInstance } from "./quartz";

import {
  buildArticleNavigationManifest,
  resolveArticleNavigationProperties,
} from "./article-navigation";
import { buildExplorerOrderManifest, createSortingService, normalizeOptions } from "./engine";
import type { CustomFileExplorerSortingOptions } from "./types";
import { EXPLORER_MANIFEST_PATH, SORTING_SERVICE_SYMBOL } from "./types";
// @ts-expect-error - `.inline.ts` is compiled to a browser script string by the build loader.
import explorerScript from "./scripts/explorer.inline.ts";
import articleNavigationStyles from "./styles/article-navigation.scss";

function contentData(content: ProcessedContent[]): unknown[] {
  return content.map(([, file]) => file.data);
}

async function emitManifest(
  ctx: BuildCtx,
  content: ProcessedContent[],
  options: CustomFileExplorerSortingOptions,
): Promise<FilePath[]> {
  const allFiles = contentData(content);
  const manifest = buildExplorerOrderManifest(allFiles, options);
  if (options.articleNavigation) {
    const properties = await resolveArticleNavigationProperties(ctx, options);
    manifest.articleNavigation = buildArticleNavigationManifest(
      allFiles,
      options,
      properties,
      content,
    );
  }
  const outputPath = path.join(ctx.argv.output, ...EXPLORER_MANIFEST_PATH.split("/"));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest)}\n`, "utf8");
  return [outputPath.replace(/\\/g, "/") as FilePath];
}

/**
 * Apply SebastianMC Custom File Explorer Sorting specifications to Quartz's
 * stock Explorer and publish a shared server-side hook for compatible
 * navigation components.
 */
export function CustomFileExplorerSortingSupport(
  userOptions: Partial<CustomFileExplorerSortingOptions> | undefined = undefined,
): QuartzEmitterPluginInstance {
  const options = normalizeOptions(userOptions);
  const service = createSortingService(options);
  const services = globalThis as unknown as Record<symbol, unknown>;
  services[Symbol.for(SORTING_SERVICE_SYMBOL)] = service;

  return {
    name: "CustomFileExplorerSortingSupport",
    externalResources() {
      return {
        css: options.articleNavigation
          ? [{ content: articleNavigationStyles, inline: true, spaPreserve: true }]
          : [],
        js: [
          {
            contentType: "inline",
            loadTime: "afterDOMReady",
            script: explorerScript,
          },
        ],
        additionalHead: [],
      };
    },
    emit: (ctx, content) => emitManifest(ctx, content, options),
    partialEmit: (ctx, content) => emitManifest(ctx, content, options),
  };
}

export default CustomFileExplorerSortingSupport;
