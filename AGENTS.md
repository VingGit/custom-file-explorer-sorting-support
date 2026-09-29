# Repository contract

## Purpose

This package brings SebastianMC Custom File Explorer Sorting specifications to Quartz 5 navigation. It must preserve upstream parsing semantics while documenting explicit Quartz substitutes for Obsidian-only runtime state.

## Instruction discovery

- Read this file before editing anywhere in the repository.
- Read relevant material in `.github/` before changing architecture, compatibility automation, or release behavior.
- Keep `README.md`, `EXAMPLES.md`, and `CHANGELOG.md` human-facing. Put agent-only operating guidance here or in `.github/`.
- Never add local machine paths, vault contents, account data, or other identifying environment details.

## Stable contracts

- `package.json` pins `obsidian-custom-sort` to the revision recorded in `.github/upstream-compatibility.json`.
- `src/vendor/obsidian-custom-sort-runtime.*` is only the typed boundary around the bundled upstream parser. Do not reimplement or casually fork its grammar.
- `src/engine.ts` owns Quartz data mapping and ordering semantics.
- Hidden items are navigation-only. This plugin is not a Quartz publication filter.
- `SORTING_SERVICE_SYMBOL` and its API version are the optional integration contract for other navigation plugins. Keep it dependency-free and backward-compatible within the major API version.
- `static/custom-file-explorer-sorting.json` is the client Explorer contract. Treat its version as public.
- `dist/` is committed installation output. Never edit it by hand; rebuild it from source.
- Use normal Quartz plugin-manager commands in integration fixtures. Do not edit host `.quartz/plugins/` output directly.

## Upstream compatibility

- Support the whole grammar exposed by the pinned upstream parser, not a selected subset.
- Preserve exact/name/wildcard/regexp target precedence and group priority/combination behavior.
- Quartz mappings for bookmarks, icons, UI-selected standard sorting, dates, folder-note metadata, and hiding must stay documented and tested.
- When upstream changes, inspect the change before updating the pinned revision, declarations, conformance tests, and compatibility record together.
- The scheduled workflow must both test current upstream source and fail visibly when its revision or version changes.

## Verification

- While iterating, run the narrowest relevant Vitest file.
- Before committing, run `npm run check`, `npm run build`, `npm run test:upstream`, and confirm a second build leaves `dist/` unchanged.
- Run host integration builds only when the plugin, service contract, generated manifest, or host configuration changes.
- Keep the fast unit/conformance suite comprehensive; weekly and host integration checks may be slower.
