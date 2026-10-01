# Roadmap continuation verification

2026-10-01. Base: `c3b96ef`. Work continues on `roadmap-work`; main is unchanged until a separate merge. The owner requested coverage of the remaining roadmap and then clarified that large features need designs before implementations. GTM writes, apply, publication and release creation remain excluded.

## Baseline and test timing

Offline `npm ci` succeeded on Windows/Node 24.19.0. Typecheck, lint and formatting passed. Baseline tests passed 183/185; two CLI cases exceeded Vitest's five-second test timeout after successful process execution (12.678 and 6.518 seconds). Build was not reached in that stopped sequence. This repeats the cold-start timing issue documented during X4.

The CLI test file now permits 60 seconds per test because a case can launch several processes. Each process retains its existing 15-second deadline, and all exit-status/output assertions remain. Unit-test timeouts elsewhere are unchanged. This is test scheduling, not a product performance guarantee.

## Release workflow

Manual and published-release events now select `refs/tags/<requested tag>`. Publish consumes the exact commit output from the successful build job, and release checks include formatting. The unrelated release-guide instructions were removed. actionlint 1.7.12 validated both existing workflows locally; its Windows executable was checked against the official SHA-256 manifest. Shellcheck and pyflakes were disabled because those optional tools were not installed. No release or publish workflow was dispatched.

The merged base passed all six hosted Ubuntu/Windows Node 20/22/24 jobs: [run 36705223210](https://github.com/arcbaslow/gtm-diff/actions/runs/36705223210). This confirms the base only, not subsequent commits.

## Implementation checks

All five required checks (typecheck, lint, format:check, test and build) passed before each implementation commit. No runtime dependency was added and package/lock versions are unchanged.

| Commit | Change | Passing tests at the check |
| --- | --- | --- |
| `f344b3d` | Build releases from the requested tag and verified commit | 185, with the timing correction in the tested working tree |
| `04b56c5` | Allow CLI tests to finish within their process deadlines | 185 |
| `937e258` | Bound export parsing and expand resilience coverage | 192 |
| `546b147` | Add full report details and bounded Markdown comments | 205 |
| `98a839f` | Package offline comparisons as a reusable GitHub Action | 211 |

The release and timing fixes were tested together, then committed separately by logical change. Release behavior was reviewed and linted, never executed. The final implementation passes all five checks on local Windows Node 20.20.2, 22.23.3 and 24.19.0, with 211 tests in 14 files per runtime. Test sources also pass their separate TypeScript check. Report ordering has permutation snapshots; default report snapshots remain unchanged by opt-in full details.

The built Action entry point was also exercised as a process against local fixtures: changed/default exit 0, changed/fail-on-change exit 1, unchanged exit 0, invalid path exit 2. It emitted valid report paths and schema-version-1 JSON on successful comparisons, bounded comments, no stdout, and no success output file on failure. No network or GTM account was involved.

The Action's setup, checkout and artifact example dependencies are pinned to verified commit objects. actionlint 1.7.12 passes the final tests and release workflows with optional shellcheck/pyflakes disabled. A source build inside the composite Action is intentional: it uses the reviewed revision and avoids committing generated distribution code. Installation needs registry access; comparison remains offline.

## Design coverage and limits

The [plan](designs/PLAN.md), [impact](designs/IMPACT.md), and [local review/policy](designs/LOCAL_REVIEW.md) documents describe contracts, failure behavior, security boundaries, acceptance tests and remaining decisions. These complete the design pass the owner requested; they are not implemented commands or engines. [Apply](designs/APPLY_BOUNDARY.md) remains explicitly prohibited.

X8's resource bounds, BOM handling and generated permutations are implemented. Its real redacted fixture corpus still needs contributor-supplied exports with provenance. [Input limits](INPUT_LIMITS.md) records the intake contract and synthetic benchmark; synthetic data is not proof of real UI export compatibility. Uncertain identity/reference semantics were left unchanged.

GitHub-rendered Markdown, interactive browser behavior, actual release/publish execution and real-container compatibility remain unverified. No new release, version, tag, pull request or GTM write was created.
