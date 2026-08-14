# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semantic](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CI on Ubuntu and Windows across Node 20 / 22 / 24, running typecheck,
  lint, format check, the test suite, and a build.
- Release workflow with a tag-versus-`package.json` version guard,
  gated on the full suite, publishing with provenance.
- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, issue and
  pull-request templates, Dependabot config.

### Changed

- README no longer advertises `npm install -g gtm-diff` and
  `npx gtm-diff`. The package is not published, so both commands failed.
  Install instructions now cover building from source, and the CI
  example uses `npx github:arcbaslow/gtm-diff`.
- The status table listed `v0.1 diff` as in progress. The diff engine,
  all three reporters, and 26 tests are complete; it is unpublished, not
  unfinished.

## [0.1.0] - unreleased

### Added

- `gtm-diff diff <before> <after>` comparing two GTM container exports.
- Entity matching by `(type, name)` rather than GTM-assigned ID, so
  diffs are stable across workspaces and environments.
- Normalization pass: strips volatile fields (`accountId`,
  `containerId`, `tagId`, `triggerId`, `variableId`, `fingerprint`,
  `path`, `tagManagerUrl`), resolves ID references to names, sorts
  parameter lists by key except for order-significant ecommerce lists,
  and keys built-in variables by type.
- Three reporters: console with ANSI colour, markdown, and HTML.
- `--exit-code` for CI, `--output` to write to a file, `--no-color`.
- Exposed as a library: `loadGtmExport`, `diffExports`,
  `renderMarkdown`.

[Unreleased]: https://github.com/arcbaslow/gtm-diff/compare/v0.1.0...HEAD
