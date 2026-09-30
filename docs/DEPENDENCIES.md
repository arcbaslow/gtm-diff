# Dependency maintenance

X3 audit and verification, 2026-09-30. Starting commit: `08555f7`. The baseline passed typecheck, lint, formatting, all 160 tests and build on Windows/Node 24.19.0. The audit reported 11 affected packages: four moderate, six high and one critical. The production-only audit reported one high-severity affected package, brace-expansion. Counts reflect npm's current advisory database, not an exploitability finding in the export parser.

## Compatible transitive updates

Targeted `npm update` refreshed the following existing dependency ranges; no `npm audit fix --force`, new override, direct runtime dependency or runtime major upgrade was used.

| Package | Before | After | Evidence |
| --- | --- | --- | --- |
| brace-expansion | 1.1.18 / 2.1.4 / 5.0.9 | 1.1.21 / 2.1.7 / 5.0.12 | [Quadratic expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [nested recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [comma recursion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) |
| @aws-sdk/xml-builder (development only) | 3.972.18 | 3.972.41 | New upstream package removes fast-xml-parser and fast-xml-builder; [parser advisory](https://github.com/advisories/GHSA-gh4j-gqv2-49f6), [builder advisory](https://github.com/advisories/GHSA-5wm8-gmm8-39j9). Registry metadata: https://registry.npmjs.org/@aws-sdk/xml-builder/3.972.41 |
| js-yaml (development only) | 4.1.1 | 4.3.2 | [Merge-source CPU consumption](https://github.com/advisories/GHSA-2883-xcg3-v3hh) |
| postcss (development only) | 8.5.10 | 8.5.28 | [Source-map reads](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) |
| nanoid (development only) | 3.3.11 | 3.3.19 | [Custom generator loops](https://github.com/advisories/GHSA-2v37-7h3g-55p8) |

The lockfile also updates the XML builder's required @smithy/types to 4.19.0 and removes its unused XML parser dependencies. Production dependency count stays at 46 in npm audit metadata. A clean `npm ci` verifies the lockfile. The initial update hit an existing global npm-cache missing-file error; a separate workspace-local cache resolved it without deleting the user's cache.

After these compatible updates, `npm audit --omit=dev` reports zero vulnerabilities. The full audit reports four affected development packages (esbuild, Vite, vite-node and Vitest): two moderate, one high and one critical. Their remediation is a separate test-tool migration, not a claim that these advisories can be exploited by passing a container export to this CLI.

## Test-tool migration decision

The [Vitest advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp) affects versions before 3.2.6. npm suggests the current Vitest 5 release, but [Vitest 5 requires Node 22.12 or newer](https://vitest.dev/guide/migration/), excluding this repository's Node 20 support. Do not accept that automatic major upgrade.

The implemented compatible target is Vitest 4.1.11 with Vite 6.4.3. Their [Vitest package metadata](https://registry.npmjs.org/vitest/4.1.11) and [Vite package metadata](https://registry.npmjs.org/vite/6.4.3) include Node 20/22/24. Vite 6 is declared explicitly as a development dependency to keep Vitest's broad Vite range from selecting a newer Node minimum. No runtime dependency is added. The [Vitest 4 migration guide](https://v4.vitest.dev/guide/migration) was reviewed; the existing config and tests work without changes. All report snapshots remain unchanged.

Vitest 4 removes vite-node, and Vite 6 replaces its old esbuild dependency. The clean final install reports zero vulnerabilities for both full and production-only audits. Audit dependency metadata falls from 588 total at baseline to 563, while production stays at 46 (including the root project). Comparing production lock entries before and after the test-tool migration shows no changes. These dated results do not guarantee that no future advisories will be published.

## Verification scope

Official Node 20.20.2 and 22.23.3 Windows archives were downloaded from [Node distributions](https://nodejs.org/dist/) and checked against their published SHA-256 manifests. They are isolated outside the Git checkout and do not replace the installed Node 24.19.0 runtime. The five required checks run with each selected Node executable on PATH so spawned CLI tests use that runtime too.

The existing GitHub workflow covers Ubuntu and Windows on Node 20/22/24. This branch push does not itself run that workflow: it listens to main pushes and pull requests to main. No PR is opened or hosted CI result claimed. Tests and application code remain offline, use existing local fixtures, and introduce no GTM write or export-execution path.

For the compatible-transitive-update commit (`7bfb42f`), all five checks passed on Windows with Node 20.20.2, 22.23.3 and 24.19.0; each run passed all 160 tests. Test-source TypeScript checking also passed. Source, tests, report snapshots and direct dependency declarations are unchanged in that commit.

After the test-tool migration and a clean `npm ci`, the final results are:

| Windows runtime | Typecheck | Lint | Format check | Tests | Build |
| --- | --- | --- | --- | --- | --- |
| Node 20.20.2 | Pass | Pass | Pass | 160 pass | Pass |
| Node 22.23.3 | Pass | Pass | Pass | 160 pass | Pass |
| Node 24.19.0 | Pass | Pass | Pass | 160 pass | Pass |

Test-source TypeScript checking, `git diff --check` and `npm pack --dry-run` also pass. The package dry run exercises the existing prepack build and manifest generation without publishing. Application source, tests, Vitest config and snapshots remain unchanged throughout X3. No new regression fixtures are needed for these dependency-only changes; the existing fixture and snapshot suite passes on all three tested runtimes. Ubuntu and hosted CI are not verified in this run.
