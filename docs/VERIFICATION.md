# Release verification — v0.1.0

Date: 2026-09-08. Local environment: Windows, Python 3.12.14; Node.js 24 for GTM Diff.

30 Vitest tests passed. Typecheck, ESLint, Prettier and the TypeScript build passed.

| Check | Command | Result |
| --- | --- | --- |
| Tests | `npm test` | Passed |
| Typecheck | `npm run typecheck` | Passed |
| Lint | `npm run lint` | Passed |
| Format | `npm run format:check` | Passed |
| Build | `npm run build` | Passed |

## Documentation and examples

- Executed the offline example commands from README against committed synthetic fixtures.
- Captured the generated output in a browser. Screenshots are output previews, not live dashboards.
- Checked local README links, SVG syntax, image presence, release versions and whitespace.
- Built the release artifacts before publishing. Source archives contain only tracked repository files.

## Scope

The test results above are a dated local run, not a claim that every test was run locally on every CI platform. API responses are mocked where tests require them. Live authentication, account mutations, external-service behavior and paid AI calls were not exercised. The CI badge links to the actual workflow rather than a static passing label.

The npm production dependency audit was rerun after the brace-expansion refresh. Development dependencies still have upstream npm audit advisories; upgrading the test/build toolchain is outside this documentation release. Do not interpret passing tests as a vulnerability audit.

## Build artifacts

`npm pack` passed and preserved the curated README. Production dependency audit: zero reported vulnerabilities.
