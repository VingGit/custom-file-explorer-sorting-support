# Custom File Explorer Sorting Support for Quartz

Use the same `sorting-spec` frontmatter in Obsidian and on a Quartz 5 site.

This plugin reads the syntax from SebastianMC's [Custom File Explorer Sorting](https://github.com/SebastianMC/obsidian-custom-sort) plugin. It applies those rules to Quartz's stock Explorer and exposes the same ordering to compatible navigation plugins such as [Root Index Panels](https://github.com/VingGit/root-index-panels).

It releases in version lockstep with Root Index Panels and
[Root Books Workspace](https://github.com/VingGit/root-books-workspace). Matching
versions are the tested combination; `0.9.0` is the first coordinated release.

## Install

From the root of a Quartz 5 site:

```bash
npx quartz plugin add github:VingGit/custom-file-explorer-sorting-support
```

Enable it in `quartz.config.yaml`:

```yaml
plugins:
  - source: github:VingGit/custom-file-explorer-sorting-support
    enabled: true
    order: 35
```

The regular `npx quartz plugin` commands own the generated `.quartz/plugins/` copy. Do not edit that generated copy by hand.

## Use

Put a YAML block in the note that owns a folder's rules. `index.md` works naturally with Folder Notes:

```yaml
---
sorting-spec: |
  < a-z by-metadata: created
---
```

At the vault root, that example orders first-level folders by the `created` property on each folder's `index.md`. Inside a folder, its own `index.md` can declare a different rule:

```yaml
---
sorting-spec: |
  Introduction
  Chapter \\d+ ...
  Appendix \\R+ ...
  --% drafts.md
---
```

The full upstream grammar is accepted, including explicit groups, file/folder groups, prefixes and suffixes, numeric/Roman/date tokens, primary and secondary ordering, priorities, combined groups, macros, exact/name/wildcard/regular-expression folder targets, metadata extractors, bookmarks, icons, advanced folder dates, standard sorting, and VS Code Unicode sorting. See [EXAMPLES.md](EXAMPLES.md) for Quartz-specific examples and the upstream project for the complete syntax reference.

## Quartz mappings

Most rules use Quartz data directly. A few Obsidian integrations need a documented Quartz equivalent:

| Obsidian feature                 | Quartz behavior                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| File creation/modification time  | Uses Quartz `dates`, then matching frontmatter dates as a fallback.                                                     |
| Folder-note metadata             | Uses `index.md` first and a same-name folder note as fallback.                                                          |
| Bookmark order                   | Uses a positive numeric `bookmarks-order` frontmatter property.                                                         |
| Folder/file icons                | Uses `icon`, then `panel.icon`, in frontmatter.                                                                         |
| `standard` / UI-selected sorting | Uses Quartz's stable folder-first, natural alphabetical order because a generated site has no Obsidian sort-menu state. |
| `--%` and `/--hide:`             | Hides the exact item from navigation only. The page is still built and remains reachable by URL or links.               |

The plugin validates every published `sorting-spec` during the build. A malformed specification fails the build with the upstream parser's location and error instead of silently publishing the wrong order.

## Options

```yaml
plugins:
  - source: github:VingGit/custom-file-explorer-sorting-support
    enabled: true
    options:
      specProperty: sorting-spec
      bookmarksOrderProperty: bookmarks-order
      iconProperty: icon
```

| Option                   | Default           | Purpose                                                                   |
| ------------------------ | ----------------- | ------------------------------------------------------------------------- |
| `specProperty`           | `sorting-spec`    | Frontmatter property containing the multiline sorting specification.      |
| `bookmarksOrderProperty` | `bookmarks-order` | Positive numeric property used for bookmark ordering and bookmark groups. |
| `iconProperty`           | `icon`            | Property used by `with-icon:` groups; `panel.<property>` is also checked. |

## How it works

During a Quartz build, the plugin parses the source notes with the upstream parser and emits `static/custom-file-explorer-sorting.json`. A small browser script applies that deterministic order whenever the Explorer renders, including after SPA navigation. Compatible server-rendered navigation plugins use a versioned in-process sorting service, so the root book selector and nested sidebars follow the same rules before HTML is written.

The upstream parser is pinned to an audited commit. A scheduled weekly compatibility workflow tests the newest upstream checkout and deliberately alerts when the commit or version changes, even if the existing conformance suite still passes.

## Integration test vault

The repository includes a self-contained [test vault](test-vault). Its first-level folders cover every sorting order recognized by the upstream parser, including both directions and aliases, plus metadata extractors, secondary ordering, groups, priorities, matching rules, integrations, and navigation-only hiding.

The Quartz integration workflow builds that same vault twice:

- with the stock Explorer and this plugin;
- with the stock Explorer, this plugin, and Root Index Panels.

Both generated sites are checked for the sorting manifest, all fixture pages, the Explorer browser adapter, and the Root Index Panels book order. Successful non-PR runs publish the two builds together as the repository's GitHub Pages site. The workflow runs only for relevant changes, on manual request, and once a week against the current Quartz 5 branch.

## Development

```bash
npm ci
npm run check
npm run build
npm run test:upstream
npm run test:integration
```

`dist/` is committed because Quartz installs Git-sourced plugins from their prebuilt output.

Release tags equal the package version without a leading `v`.

## License

GPL-3.0-only. The package bundles parser code from Custom File Explorer Sorting; attribution and the pinned revision are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
