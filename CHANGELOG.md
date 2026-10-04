# Changelog

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
