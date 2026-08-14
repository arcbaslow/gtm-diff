## What this changes

<!-- One sentence on what changed and why. -->

## How to verify

<!--
npm run typecheck
npm run lint
npm run format:check
npm test

Add a before/after fixture pair if this changes diff output.
-->

## Checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run format:check` clean
- [ ] `npm test` passes
- [ ] Output is still deterministic — same inputs, same diff, same ordering
- [ ] No new runtime dependency, or a reason for it is written above
- [ ] Container-derived data reaching a reporter is escaped (`escapeHtml`) or sanitized (`sanitizeLabel`)
- [ ] No network calls added to the tool or the tests
- [ ] CHANGELOG.md updated if this is user-visible
