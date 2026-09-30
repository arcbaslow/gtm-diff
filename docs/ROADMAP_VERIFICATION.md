# Roadmap work verification

Date: 2026-09-30. Branch: `roadmap-work`, based on main at `4dec665e7c8a529b1c33ec792d77481d9c7a1b93`.

Local environment: Windows, Node 24.19.0, npm 11.17.0.

## Regression evidence

- N2: `condition-order`, `unknown-fields` and `object-order` fixture pairs reproduced false changes, lost fields and different report ordering. All three tests failed before the fix. Snapshots cover the diff and all three reporters; permutations preserve authored list order.
- N1: `list-order-before.json` / `list-order-after.json` reproduced the hidden change. Two regression cases failed before the fix (custom and keyless lists). Lists now preserve authored order; the console snapshot fixes field ordering. Keyed parameters and maps still sort.

| Check | Baseline | Final |
| --- | --- | --- |
| npm ci | Passed, 517 packages installed | Same locked dependencies |
| npm run typecheck | Passed | Pending |
| npm run lint | Passed | Pending |
| npm run format:check | Passed | Pending |
| npm test | Passed, 30 tests | Pending |
| npm run build | Passed | Pending |

The first restricted npm ci attempt stalled and was stopped. Retrying with registry/cache access succeeded. npm audit reported 11 advisories (4 moderate, 6 high, 1 critical); npm audit --omit=dev reported one high-severity brace-expansion dependency advisory. No automatic dependency changes were made. These counts are dated audit observations, not an exploitability assessment.

Every implementation commit must pass all five checks. Reproduction fixtures are synthetic and contain no production credentials. No GTM network calls, live-container writes, pushes, PRs, releases, tags or publication are part of this run. Only Windows/Node 24 was executed locally; the existing CI matrix was not dispatched.
