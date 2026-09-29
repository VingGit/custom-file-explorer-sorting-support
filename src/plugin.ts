import fs from "node:fs/promises";
import path from "node:path";

import type { BuildCtx, FilePath, ProcessedContent, QuartzEmitterPluginInstance } from "./quartz";

import { buildExplorerOrderManifest, createSortingService, normalizeOptions } from "./engine";
import type { CustomFileExplorerSortingOptions } from "./types";
import { EXPLORER_MANIFEST_PATH, SORTING_SERVICE_SYMBOL } from "./types";
// @ts-expect-error - `.inline.ts` is compiled to a browser script string by the build loader.
import explorerScript from "./scripts/explorer.inline.ts";

function contentData(content: ProcessedContent[]): unknown[] {
  return content.map(([, file]) => file.data);
}

async function emitManifest(
  ctx: BuildCtx,
  content: ProcessedContent[],
  options: CustomFileExplorerSortingOptions,
): Promise<FilePath[]> {
  const manifest = buildExplorerOrderManifest(contentData(content), options);
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
  (globalThis as unknown as Record<symbol, unknown>)[Symbol.for(SORTING_SERVICE_SYMBOL)] = service;

  return {
    name: "CustomFileExplorerSortingSupport",
    externalResources() {
      return {
        css: [],
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
