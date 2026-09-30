# Roadmap work verification

Date: 2026-09-30. Branch: `roadmap-work`, based on main at `4dec665e7c8a529b1c33ec792d77481d9c7a1b93`.

Local environment: Windows, Node 24.19.0, npm 11.17.0.

## Regression evidence

- N5: process tests exercise the source CLI through tsx using only local fixtures: default/opt-in statuses, metadata-only changes, missing/malformed files, invalid flags, failed writes, report bytes and help. The installed oclif already returned 2 for sampled argument errors, but the repo did not own/document the full contract; its raw control-character diagnostic failed the new test. The explicit catch preserves intentional exit 1 and sanitizes errors. Baseline loading is sequential for stable failure selection.
- Additional test-source typechecking caught a table-test callback that spread a string instead of the full argument list. The table now uses named argument arrays and checks the expected diagnostic for each failure, including actual malformed inputs and output failure. `tsconfig.test.json` typechecking passes.
- N4: `reporter-hostile-before.json` / `reporter-hostile-after.json` cover source labels, added/removed/modified names and types, built-ins, metadata, paths and values. Three regression tests failed before the fix. Snapshots cover all reporters; Markdown summaries now use HTML entities and C1/Unicode separators are visible escapes. Markdown was inspected as generated text, not rendered by GitHub or a browser.
- N3: `duplicate-identity`, `malformed-entry` and `prototype-identity` pairs show silent overwrites, late crashes and hidden built-ins. Before the fix, 23 of 24 input regression cases failed. The validator now checks consumed shapes and duplicate keys/IDs; it is intentionally not a complete resource schema. The lower-level normalized diff also copies JSON into canonical own-key dictionaries before microdiff.
- N2: `condition-order`, `unknown-fields` and `object-order` fixture pairs reproduced false changes, lost fields and different report ordering. All three tests failed before the fix. Snapshots cover the diff and all three reporters; permutations preserve authored list order.
- N1: `list-order-before.json` / `list-order-after.json` reproduced the hidden change. Two regression cases failed before the fix (custom and keyless lists). Lists now preserve authored order; the console snapshot fixes field ordering. Keyed parameters and maps still sort.

| Check | Baseline | Final |
| --- | --- | --- |
| npm ci | Passed, 517 packages installed | Same locked dependencies |
| npm run typecheck | Passed | Passed |
| npm run lint | Passed | Passed |
| npm run format:check | Passed | Passed |
| npm test | Passed, 30 tests | Passed, 79 tests in 7 files |
| npm run build | Passed | Passed |

The first restricted npm ci attempt stalled and was stopped. Retrying with registry/cache access succeeded. npm audit reported 11 advisories (4 moderate, 6 high, 1 critical); npm audit --omit=dev reported one high-severity brace-expansion dependency advisory. No automatic dependency changes were made. These counts are dated audit observations, not an exploitability assessment.

Every commit passed all five checks before creation. Reproduction fixtures are synthetic and contain no production credentials. No GTM network calls, live-container writes, pushes, PRs, releases, tags or publication were performed. Only Windows/Node 24 was executed locally; the existing CI matrix was not dispatched.

## Commits and checks

| Commit | Change | All five checks | Tests |
| --- | --- | --- | --- |
| `604ddfb` | Document the evidence and staged roadmap | Passed | 30 |
| `04dd3e2` | Preserve authored parameter list order | Passed | 34 |
| `dcb9132` | Canonicalize nested values without dropping fields | Passed | 37 |
| `e564ea6` | Reject ambiguous exports and protect entity keys | Passed | 61 |
| `d69f66a` | Escape report labels and Markdown HTML contexts | Passed | 65 |
| `521f3b3` | Define the diff command exit contract | Passed | 79 |
| `969f33f` | Verify each CLI failure with its intended arguments | Passed | 79 |

The final documentation commit records this result without changing behavior. Runtime dependencies, lockfile and package version are unchanged.

## Additional verification

- `node node_modules/typescript/bin/tsc --project tsconfig.test.json --noEmit` passed, including test sources which the regular typecheck excludes.
- Built `bin/run.js` smoke checks passed for unchanged status 0, changed status 1, metadata-only status 1, malformed input status 2, missing input status 2 and help status 0. Successful comparisons had empty stderr; failed comparisons had diagnostics.
- Regenerated the committed Markdown/HTML demo reports from the existing local fixture pair.
- Reviewed snapshots for stable report ordering, safe HTML fragments and visibly escaped controls. No added runtime dependency, export execution or network code was introduced.
- `git diff --check` passed. Commits are local to `roadmap-work`.

## Deferred work and verification limits

The roadmap retains broader entity coverage, remaining nested reference rules, dependency updates, JSON schema, v0.2 plan, Action packaging, larger PR reports and richer fixture/resilience work. These need broader resource semantics, public contracts, real redacted fixtures or runtime-matrix testing. Existing docs do not define a plan-file format, so `plan` was not built. v0.3 apply is only a later design topic and was explicitly excluded.

No fresh GTM UI exports, live GTM behavior, hosted CI jobs, GitHub comment rendering, browser exploitation checks, Ubuntu, Node 20 or Node 22 were verified. Third-party tool features were researched in their public documentation, not executed. The UI export envelope is observed in repository fixtures; the API resource reference does not prove a complete current UI-export schema. Remaining ambiguous normalization policies and delimiter/type-name edge cases are listed as open questions in the roadmap.
