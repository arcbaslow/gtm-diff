# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semantic](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Bound exports to 32 MiB, 128 object/array nesting levels and 500,000 values before recursive normalization. Accept a single leading UTF-8 BOM without changing embedded string data.
- Add `--format json` and library `renderJson` with a version 1 report contract, explicit coverage, full normalized change data, deterministic ordering and reversible escaping for untrusted strings.
- Compare clients, transformations, custom templates, zones and Google tag configs with typed resources, deterministic ordering, consumed-shape validation and escaped reports. Resolve client/transformation folders and zone evaluation triggers; match nameless Google tag configs by type and source ID. Preserve template text as inert data and retain gallery metadata.
- Report omitted container-version fields in all formats and expose them through the library; add `--strict` to return status 2 before writing a report when coverage is incomplete.
- Document and enforce the diff CLI exit contract: success `0`, opt-in differences `1`, command/input/output errors `2`; validate the before file first and sanitize diagnostics. Add offline command-process coverage and a CI status-handling recipe.

### Changed

- Upgrade development testing to Vitest 4.1.11 and Vite 6.4.3, removing the remaining audited test-tool vulnerabilities while retaining Node 20/22/24 support and unchanged report snapshots.

### Fixed

- Select the requested tag for manual release builds, publish from the build's verified commit, and include formatting in release checks. Correct the release instructions.
- Update compatible transitive dependencies to remove the production brace-expansion advisories and affected development XML, YAML, PostCSS and Nano ID packages without adding runtime dependencies.
- Normalize documented singleton Parameters in triggers, tag priority/consent and variable conversions; validate their consumed shapes. Resolve nested trigger-reference Parameters by target type/name, retain explicit unresolved IDs, and preserve tag-reference names and authored list order.
- Escape Markdown HTML summaries and code labels correctly, sanitize report source labels, and visibly encode C1 controls and Unicode line separators in diff paths and values.
- Reject malformed consumed export structures and ambiguous identities/source IDs instead of crashing or hiding changes. Treat prototype-named keys as ordinary data, including in the normalized library API.
- Compare complete nested condition values, preserve unknown parameter/condition fields, and stabilize report ordering across object-key permutations.
- Preserve all parameter list ordering, including custom and keyless lists, so authored order changes remain visible.

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
