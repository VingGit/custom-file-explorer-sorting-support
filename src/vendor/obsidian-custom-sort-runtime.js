// The upstream project publishes TypeScript source rather than a library build.
// Keeping these imports behind a JavaScript boundary lets our strict typecheck
// use the audited declarations next to this file while tsup bundles the exact
// upstream parser pinned in package.json.
export { SortingSpecProcessor } from "obsidian-custom-sort/src/custom-sort/sorting-spec-processor";
export {
  CustomSortGroupType,
  CustomSortOrder,
  DEFAULT_METADATA_FIELD_FOR_SORTING,
} from "obsidian-custom-sort/src/custom-sort/custom-sort-types";
