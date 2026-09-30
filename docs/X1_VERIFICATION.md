# X1 comparison coverage verification

Date: 2026-09-30. Branch: `roadmap-work`. Starting commit: `52847cb`. The owner requested one roadmap task at a time with local commits. This follow-up handles X1 only; the original N1–N5 baseline and results remain in [ROADMAP_VERIFICATION.md](ROADMAP_VERIFICATION.md).

## Checks

Environment: Windows, Node 24.19.0, npm 11.17.0. Reused the installed dependencies from the earlier successful `npm ci`; package metadata and lockfile are unchanged.

| Check | Starting result | X1 result |
| --- | --- | --- |
| `npm run typecheck` | Passed | Passed |
| `npm run lint` | Passed | Passed |
| `npm run format:check` | Passed | Passed |
| `npm test` | Passed, 79 tests in 7 files | Passed, 120 tests in 9 files |
| `npm run build` | Passed | Passed |

All five checks passed before each local commit. `node node_modules/typescript/bin/tsc --project tsconfig.test.json --noEmit` also checks the test sources and passed.

## Changes and evidence

- `22891ad` — Report incomplete comparisons and add strict coverage checks. All five checks passed with 84 tests. The coverage fixture pair failed before implementation because omission metadata was absent. Tests verify sanitized notices in every reporter, stable field order, exit 2 under `--strict`, and preservation of an existing report file on failure.
- The resource-support commit containing this record adds all five missing collections, fixture pairs, types, validation and normalization. The resource fixture regression failed before implementation because these collections were omitted. It now reports five modified resources and two unchanged supporting entities. The final commit hash is available in the local log and task report.

New resource tests cover ID renumbering, folder and zone-trigger resolution, missing references, inert template text, gallery metadata, client priority, weak references, Google tag config identity, additions/removals/renames, unknown fields, malformed structures, duplicate identities/source IDs and hostile labels for every kind and change status. Older normalized library objects may omit the new maps; their empty-map fallback retains prototype-key protection.

Snapshots and permutation tests verify deterministic reports. Existing snapshot changes only append the five new kind entries or summary rows; previous field ordering and values are unchanged. Markdown and HTML demo files were regenerated; the README identifies the retained screenshot as the v0.1 report.

The built CLI was checked with local fixtures: strict mode returns 1 for five resource changes with `--exit-code`, 0 for an identical supported export, and 2 for unknown version fields. The normal command-process suite also checks stdout/stderr and report-file behavior. `git diff --check` passed.

## Limits and remaining tasks

No new runtime dependency, network code, GTM write path or execution of export contents was added. No push, PR, version change, tag or publication was performed.

The [coverage contract](COVERAGE.md) links the current API sources and documents policies. These are synthetic fixtures based on documented API resources. Fresh GTM UI exports, live tracking behavior, hosted CI, Ubuntu, Node 20/22 and browser/GitHub rendering were not verified in this run.

Parameter trigger references and template-backed type IDs still compare literally. Zone child/whitelist arrays retain authored order, and Google tag configs match by type/source ID because the API resource has no name. These limitations are explicit; strict mode detects omitted version fields and does not certify complete semantic normalization. X2 remains next. Dependency remediation, structured JSON output, plan design, Action packaging, larger reports and real fixture collection remain proposals. No `plan` or `apply` work was started.
