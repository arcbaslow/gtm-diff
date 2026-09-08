# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semantic](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-08

### Added

- SVG banner and icon, reproducible report screenshots, offline examples and release verification.

- CI on Ubuntu and Windows across Node 20 / 22 / 24, running typecheck,
  lint, format check, the test suite, and a build.
- Release workflow with a tag-versus-`package.json` version guard,
  gated on the full suite, publishing with provenance.
- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, issue and
  pull-request templates, Dependabot config.

### Changed

- Package description now describes the implemented diff command. Packing preserves the hand-written README instead of running the Oclif README generator.
- Refreshed the transitive `brace-expansion` lockfile entries to address the production dependency advisory reported by npm audit.
- README no longer advertises `npm install -g gtm-diff` and
  `npx gtm-diff`. The package is not published, so both commands failed.
  Install instructions now cover building from source and running the
  built CLI directly in CI.
- The status table listed `v0.1 diff` as in progress. The diff engine,
  all three reporters, and 30 tests are complete in this first release.

### Initial diff engine

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

[0.1.0]: https://github.com/arcbaslow/gtm-diff/releases/tag/v0.1.0
