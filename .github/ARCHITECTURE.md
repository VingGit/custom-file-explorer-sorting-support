# Architecture

## Build-time model

The emitter receives all processed Quartz files. `src/model.ts` turns their slugs, source-relative paths, frontmatter, and dates into a vault model without importing Quartz internals. Folder metadata merges a same-name note with `index.md`, with `index.md` taking precedence.

`src/engine.ts` passes every multiline specification to the exact upstream parser pinned in `package.json`. It resolves target rules in upstream order: exact path, folder name, then wildcard or regular expression. Sorting is applied to opaque caller values so server-rendered components can use it without sharing their node types.

## Browser navigation surfaces

The emitter writes a versioned JSON manifest containing ordered and hidden child keys for each matched folder. The inline script fetches that manifest, observes stock Explorer, folder-page directory-list, and Backlinks rendering, and reorders the existing DOM after initial load and SPA navigation. Folder links are resolved against the manifest so their `index.md` metadata participates in the same order as Explorer. Backlinks use the same hierarchy of folder and file ranks, with Quartz's natural path order as the fallback where no sorting specification applies. It does not alter content publication.

When `articleNavigation` is enabled, the emitter first tries to read Article Navigator's `previousKey` and `nextKey` from the vault's `.obsidian/plugins/article-navigator/data.json`; configured key names are the fallback. Resolved targets are added to the version-1 manifest as optional data. The emitter also records when a navigation target occurs in the processed Markdown body, using Quartz's canonical `data-slug`; the browser adapter then hides a Backlinks row only when the Previous/Next property is its sole source. It renders localized Previous/Next cards after Quartz's article-ending rule and binds Quartz-compatible hover previews directly to those dynamically inserted internal links. The targeted binder follows Quartz's fetch, content-extraction, positioning, and cleanup behavior without broadcasting a site-wide render event. It does not mutate Quartz's content index, so all navigation relationships remain visible in local and global graphs. The CSS uses only Quartz theme variables and therefore follows light, dark, and custom themes.

## Compatible navigation components

The factory registers a frozen version-1 service on `Symbol.for("obsidian-material-plugins/navigation-sorting/v1")`. Consumers must look up that symbol at render time, validate `apiVersion`, and preserve their existing order if `matched` is false or the service is absent. This intentionally avoids a package dependency or license coupling.

This package and Root Books implementations release independently. Compatibility is based on `navigation-sorting/v1` in the shared contract catalog rather than package-version equality. Tags equal the version without a leading `v`.

## Upstream boundary

The upstream package ships TypeScript source instead of a reusable parser build. `src/vendor/obsidian-custom-sort-runtime.js` is a narrow runtime re-export that tsup bundles. Its sibling declaration describes only the parser surface this package consumes, keeping strict checks focused on this repository while the weekly workflow detects upstream API drift.

## Quartz integration fixture

`test-vault/` is generated deterministically from `scripts/generate-integration-vault.mjs` and committed. Each first-level folder owns one upstream order or syntax feature, which keeps failures attributable and makes the built site useful for manual inspection.

`scripts/run-quartz-integration.mjs` uses a disposable checkout of the current Quartz 5 branch. It installs this checkout through Quartz's local plugin-manager path, builds the stock Explorer variant, then installs the pinned Quartz Root Books Workspace revision and builds the combined variant. It compares the manifests, checks every case and target folder, verifies both browser navigation surfaces, and proves that the Root Books switcher follows the root specification. `.github/workflows/quartz-integration.yml` uploads both sites and deploys their combined landing page on non-PR runs.
