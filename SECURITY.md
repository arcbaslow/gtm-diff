# Security policy

## Reporting a vulnerability

Open a private security advisory on the repo:
https://github.com/arcbaslow/gtm-diff/security/advisories/new

Please do not file public issues for security problems.

## The threat model, in one paragraph

`gtm-diff` reads a GTM container export and writes a report. A container
export is not inert data: it contains Custom HTML tags and Custom
JavaScript variables, which are arbitrary attacker-authored code, and it
may contain API keys, measurement IDs, and internal hostnames in tag
parameters. The tool must never execute that code and must never leak it
somewhere the operator did not ask for.

## What's in scope

- **A regression in HTML-reporter escaping** (`src/reporters/html.ts`).
  Container exports contain Custom HTML tags. Every interpolation of
  container-derived data currently goes through `escapeHtml`, and tests
  cover both the value path and the entity-name path. If you find one
  that does not, report it — a diff report is exactly the artifact a
  reviewer opens in a browser without thinking, so this is the
  highest-value bug class here.
- **A regression in `sanitizeLabel`** (`src/reporters/shared.ts`).
  Entity names are stripped of C0/C1 control characters before they
  reach any reporter, because a name carrying ESC sequences could move
  the cursor and paint over lines the console reporter already printed,
  hiding one change behind another.
- Any path where parsing an export executes code from it, including
  `eval`, `Function`, dynamic `import`, or prototype pollution through
  `JSON.parse` output reaching an object merge.
- Path traversal or arbitrary write through `--output`.
- Anything that sends container contents off the machine. `diff` is
  offline and must stay offline.
- Dependency-chain vulnerabilities in `@oclif/core`, `chalk`, or
  `microdiff`.

## What's out of scope

- Secrets you committed into a container export that is itself in a
  public repo. The tool reads what you hand it.
- Bugs in Google Tag Manager or its export format — report those to
  Google.
- The unimplemented `plan` and `apply` commands. When `apply` lands, its
  OAuth handling and write path become the top scope item; until then
  there is nothing to report.

## Credentials

There are none. v0.1 takes two JSON files and touches no network and no
API. Nothing is read from the environment and nothing is written outside
the path you pass to `--output`.

That changes at v0.3. `apply` will require a bring-your-own OAuth client,
default to dry-run, operate only in a newly created workspace, never
publish, and never delete a workspace.

## Disclosure timeline

I aim to acknowledge security reports within 7 days and ship a fix or
mitigation within 30 days. For high-severity issues, both windows
shrink.
