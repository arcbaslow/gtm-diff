# Roadmap continuation verification

2026-10-01. Base: `c3b96ef`. Work continues on `roadmap-work`; main is unchanged until a separate merge. The owner requested coverage of the remaining roadmap and then clarified that large features need designs before implementations. GTM writes, apply, publication and release creation remain excluded.

## Baseline and test timing

Offline `npm ci` succeeded on Windows/Node 24.19.0. Typecheck, lint and formatting passed. Baseline tests passed 183/185; two CLI cases exceeded Vitest's five-second test timeout after successful process execution (12.678 and 6.518 seconds). Build was not reached in that stopped sequence. This repeats the cold-start timing issue documented during X4.

The CLI test file now permits 60 seconds per test because a case can launch several processes. Each process retains its existing 15-second deadline, and all exit-status/output assertions remain. Unit-test timeouts elsewhere are unchanged. This is test scheduling, not a product performance guarantee.

## Release workflow

Manual and published-release events now select `refs/tags/<requested tag>`. Publish consumes the exact commit output from the successful build job, and release checks include formatting. The unrelated release-guide instructions were removed. actionlint 1.7.12 validated both existing workflows locally; its Windows executable was checked against the official SHA-256 manifest. Shellcheck and pyflakes were disabled because those optional tools were not installed. No release or publish workflow was dispatched.

The merged base passed all six hosted Ubuntu/Windows Node 20/22/24 jobs: [run 36705223210](https://github.com/arcbaslow/gtm-diff/actions/runs/36705223210). This confirms the base only, not subsequent commits.
