# Architecture

## Build-time model

The emitter receives all processed Quartz files. `src/model.ts` turns their slugs, source-relative paths, frontmatter, and dates into a vault model without importing Quartz internals. Folder metadata merges a same-name note with `index.md`, with `index.md` taking precedence.

`src/engine.ts` passes every multiline specification to the exact upstream parser pinned in `package.json`. It resolves target rules in upstream order: exact path, folder name, then wildcard or regular expression. Sorting is applied to opaque caller values so server-rendered components can use it without sharing their node types.

## Stock Explorer

The emitter writes a versioned JSON manifest containing ordered and hidden child keys for each matched folder. The inline script fetches that manifest, observes Explorer rendering, and reorders the existing DOM after initial load and SPA navigation. It does not alter content publication.

## Compatible navigation components

The factory registers a frozen version-1 service on `Symbol.for("@vinggit/custom-file-explorer-sorting-support/service/v1")`. Consumers must look up that symbol at render time, validate `apiVersion`, and preserve their existing order if `matched` is false or the service is absent. This intentionally avoids a package dependency or license coupling.

## Upstream boundary

The upstream package ships TypeScript source instead of a reusable parser build. `src/vendor/obsidian-custom-sort-runtime.js` is a narrow runtime re-export that tsup bundles. Its sibling declaration describes only the parser surface this package consumes, keeping strict checks focused on this repository while the weekly workflow detects upstream API drift.
