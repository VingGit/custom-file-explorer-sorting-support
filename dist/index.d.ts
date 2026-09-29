import { CustomFileExplorerSortingOptions, QuartzEmitterPluginInstance, ExplorerOrderManifest, QuartzNavigationSortingService } from './types.js';
export { BuildCtx, ChangeEvent, EXPLORER_MANIFEST_PATH, FilePath, ProcessedContent, QuartzEmitterPlugin, QuartzPluginData, QuartzSortInput, QuartzSortResult, QuartzTransformerPlugin, QuartzTransformerPluginInstance, SORTING_SERVICE_SYMBOL, StaticResources } from './types.js';
import 'hast';
import 'unified';
import 'vfile';

/**
 * Apply SebastianMC Custom File Explorer Sorting specifications to Quartz's
 * stock Explorer and publish a shared server-side hook for compatible
 * navigation components.
 */
declare function CustomFileExplorerSortingSupport(userOptions?: Partial<CustomFileExplorerSortingOptions> | undefined): QuartzEmitterPluginInstance;

declare function normalizeOptions(value: unknown): CustomFileExplorerSortingOptions;
declare function createSortingService(userOptions?: unknown): QuartzNavigationSortingService;
declare function buildExplorerOrderManifest(allFiles: unknown, userOptions?: unknown): ExplorerOrderManifest;
declare function validateSortingSpecifications(allFiles: unknown, userOptions?: unknown): void;

export { CustomFileExplorerSortingOptions, CustomFileExplorerSortingSupport, ExplorerOrderManifest, QuartzEmitterPluginInstance, QuartzNavigationSortingService, buildExplorerOrderManifest, createSortingService, CustomFileExplorerSortingSupport as default, normalizeOptions, validateSortingSpecifications };
