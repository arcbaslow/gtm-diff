# Contributing

Patches welcome. Keep changes small and focused.

## Setup

```sh
git clone https://github.com/arcbaslow/gtm-diff
cd gtm-diff
npm ci
npm run dev -- diff test/fixtures/minimal-before.json test/fixtures/minimal-after.json
```

Node.js `>=20.0.0`.

## Before you push

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
```

All four must pass. CI runs them on Ubuntu and Windows across Node 20 /
22 / 24, then verifies the package builds.

`npm run lint:fix` and `npm run format` fix most of what the first two
catch.

## Commit style

Plain imperative sentence, sentence-case acceptable. No Conventional
Commits prefixes (`feat:`, `fix:`, `chore:`). No `Co-Authored-By:`
trailers, no `Generated with...` footers, no emoji.

Examples of the desired tone:

- `match entities by type and name rather than GTM id`
- `keep ecommerce item order significant during normalization`
- `strip control characters out of entity labels`
- `resolve parentFolderId to a folder name`

PR refs `(#NNN)` only when one exists.

## Ground rules

These are the product, not preferences:

**Read-only by default.** `diff` never touches GTM. `plan` (v0.2) emits
a plan file and nothing else. `apply` (v0.3) does not exist until the
diff engine has been used in anger against real containers. A PR that
adds a write path before then is premature regardless of quality.

**Deterministic output.** Same inputs, same diff, stable ordering. If
your change can reorder output, it needs a snapshot test proving it
doesn't.

**No new runtime dependencies without a written reason** in the commit
or the PR body. Dev dependencies are easier, but the runtime tree stays
small on purpose — this thing runs in other people's CI.

**TypeScript strict.** No `any` escape hatches, no `@ts-ignore` without
a comment saying why.

## Treat container exports as untrusted input

A GTM export is not inert data. It contains Custom HTML tags and Custom
JavaScript variables — arbitrary code authored by anyone who can edit
the container — and often API keys and internal hostnames in tag
parameters.

Two rules follow:

1. **Never execute anything from an export.** No `eval`, no `Function`,
   no dynamic `import` of export contents.
2. **Escape on the way out.** Anything container-derived that reaches
   the HTML reporter goes through `escapeHtml`. Anything reaching a
   label goes through `sanitizeLabel`. Both are covered by tests in
   `test/unit/reporters.test.ts`; if you add a new reporter or a new
   interpolation point, add a case.

## Tests use fixtures, never a live container

`test/fixtures/` holds trimmed GTM exports. v0.1 makes no network calls
at all, and the test suite must not introduce any.

If you're fixing a normalization or matching bug, the fixture pair
showing the wrong diff is more valuable than the fix — send it even if
you don't have a patch.

## What I'll accept

- Bug fixes with a regression test
- Normalization rules for GTM fields the current pass mishandles,
  ideally with a fixture from a real export
- Reporter improvements that keep output deterministic
- Documentation fixes
- CI improvements

## What I'll push back on

- `apply`, or anything that writes to a GTM container, before v0.3
- New runtime dependencies without a reason
- Rename tracking. A renamed entity shows as one removed and one added,
  same as Git. Heuristic rename detection would make the diff
  non-deterministic and is not worth it.
- Big rewrites without a discussion first — open an issue describing the
  shape before the work

## License

By contributing you agree your changes are released under the MIT
license, same as the rest of the repo.
