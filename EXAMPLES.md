# Sorting examples

These examples belong in a YAML frontmatter property named `sorting-spec`.

## Put first-level folders in a fixed order

Use this in the root `index.md`:

```yaml
sorting-spec: |
  Projects
  Areas
  Resources
  Archive
```

Items not named in the list follow those four using the upstream plugin's normal outsider ordering.

## Sort books by metadata

```yaml
sorting-spec: |
  < a-z by-metadata: created
```

Give each book's `index.md` a `created` property. Quartz reads folder metadata from `index.md` first, then from a same-name folder note.

## Use different rules in a subfolder

The root note can target more than one folder:

```yaml
sorting-spec: |
  target-folder: /
  Projects
  Areas
  Archive

  target-folder: name: Archive
  > modified
```

Alternatively, place `> modified` directly in `Archive/index.md`.

## Natural chapter and appendix numbers

```yaml
sorting-spec: |
  Introduction
  Chapter \\d+ ...
  Appendix \\R+ ...
  References
```

This keeps `Chapter 2` before `Chapter 10` and understands Roman numerals in appendix names.

## Bookmark and icon equivalents

```yaml
sorting-spec: |
  bookmarked:
    < by-bookmarks-order
  with-icon: star
```

For Quartz, set `bookmarks-order: 1`, `bookmarks-order: 2`, and so on. Icon groups read `icon: star` or `panel: { icon: star }`.

## Hide an item from navigation

```yaml
sorting-spec: |
  --% private-overview.md
  /--hide: Drafts
```

Hiding affects Explorer and compatible navigation components only. It does not remove a page from the generated site. Use Quartz publishing/filtering features when a page must not be published.
