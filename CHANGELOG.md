# Changelog

## Unreleased

## 0.13.1

### Fixed

- Prevent article-navigation cards from triggering an endless Quartz render
  cycle, which pinned Explorer scrolling and left hover previews active.
- Bind hover previews directly to article-navigation links so inserting the
  cards no longer causes a second Explorer rebuild and visible navigation jerk.

## 0.13.0

### Fixed

- Build both published Quartz test sites with their full GitHub Pages base paths
  so stock Explorer links stay inside the selected integration site.
- Keep an intentional Markdown backlink visible when it duplicates a
  Previous/Next frontmatter relationship.
- Enable Quartz hover previews on generated article-navigation cards.

### Added

- Localize article-navigation labels for Finnish Quartz sites with `Edellinen`
  and `Seuraava`.

## 0.12.0

### Added

- Sort stock Quartz Backlinks with the same hierarchical rules as Explorer.
- Optionally detect Article Navigator properties, hide only their entries from
  the Backlinks list, and render responsive Previous/Next cards using Quartz
  theme variables while preserving the links in local and global graphs.

## 0.11.0

### Changed

- Coordinate the `0.11.0` ecosystem release with Root Books Toolkit's new
  plugin-health dashboard and declarative selected-setting watches. Sorting
  behavior and the shared service contract are unchanged.

## 0.10.0

### Changed

- Coordinate the `0.10.0` ecosystem release with Root Books Toolkit's
  read-only companion audit and Root Index Panels' simplified content-policy
  configuration. Sorting behavior and the shared service contract are
  unchanged.

## 0.9.3

### Fixed

- Apply each folder's sorting specification to Quartz folder-page directory
  overviews, including nested folders whose metadata comes from `index.md`.
- Resolve the generated sorting manifest correctly when Quartz is hosted below
  a URL subpath.

## 0.9.2

### Changed

- Coordinate the `0.9.2` ecosystem release with the Obsidian plugin's new
  Root Books Toolkit display name. Sorting behavior is unchanged.

## 0.9.1

### Changed

- Coordinate the corrective `0.9.1` ecosystem release after Root Books
  Workspace moved to a fresh repository for its new Obsidian plugin ID.

## 0.9.0

### Changed

- Coordinate the first lockstep release with Root Books Workspace and Root
  Index Panels.
- Align package and Quartz manifest versions and require release tags without a
  leading `v`.

## 0.2.0

### Minor Changes

- 266b586: Implement complete Custom File Explorer Sorting syntax support for Quartz navigation.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Full parsing and Quartz navigation support for Custom File Explorer Sorting specifications.
- Stock Explorer ordering through a generated, versioned manifest.
- An optional server-side sorting service for compatible navigation plugins.
- Conformance, build, and scheduled upstream-compatibility checks.
- A comprehensive bundled test vault and dual Quartz integration-site workflow.

### Changed

- Replaced the generic Quartz plugin template with the production sorting adapter.
