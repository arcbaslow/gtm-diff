# gtm-diff

[![tests](https://github.com/arcbaslow/gtm-diff/actions/workflows/tests.yml/badge.svg)](https://github.com/arcbaslow/gtm-diff/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-0.1.0-blue.svg)](CHANGELOG.md)

A CLI toolkit for Google Tag Manager. Terraform-style developer experience:
predictable, read-only by default, plan before apply.

```sh
gtm-diff diff before.json after.json
```

## Why

GTM containers are routinely changed by several people at once, often by
non-engineers, with no review. A bad tag change can silently break site
analytics for weeks. `gtm-diff` brings code review, CI, and versioned change
management to GTM.

## Status

Phased delivery. `v0.1` ships first. `v0.2` (`plan`) and `v0.3` (`apply`) land
only after the diff engine has been used in anger.

| Version | Command | Writes to GTM? | Status |
|---|---|---|---|
| v0.1 | `gtm-diff diff <before> <after>` | no | complete, not yet published |
| v0.2 | `gtm-diff plan --source <a> --target <b>` | no — emits a plan file | planned |
| v0.3 | `gtm-diff apply --plan plan.json` | yes, with `--apply` and explicit confirms | planned |

## Install

Not on npm yet. Build it from source:

```sh
git clone https://github.com/arcbaslow/gtm-diff
cd gtm-diff
npm ci
npm run build
npm link          # puts `gtm-diff` on your PATH
```

Or run it without linking:

```sh
npm run dev -- diff before.json after.json
```

Node.js `>=20.0.0` required.

Once the first release is cut, `npm install -g gtm-diff` and
`npx gtm-diff` will work as you'd expect.

## Usage — `diff`

Compare two GTM container JSON exports produced by **Admin → Export Container**
in the GTM UI (or by the GTM API).

```sh
gtm-diff diff before.json after.json
gtm-diff diff before.json after.json --format markdown --output diff.md
gtm-diff diff before.json after.json --format html     --output diff.html
gtm-diff diff before.json after.json --exit-code   # for CI
```

### Flags

| Flag | Description |
|---|---|
| `-f, --format` | `console` (default), `markdown`, or `html` |
| `-o, --output` | Write the report to a file instead of stdout |
| `--no-color` | Disable ANSI colors in the console output |
| `--exit-code` | Exit with code `1` if any differences are found |

### What the diff compares

Entities are matched by `(type, name)`, not by GTM-assigned ID, so the diff is
stable across exports from different workspaces or environments. Before
comparing, each entity is normalized:

- Volatile fields are stripped: `accountId`, `containerId`, `tagId`,
  `triggerId`, `variableId`, `fingerprint`, `path`, `tagManagerUrl`.
- ID references are resolved to names: `firingTriggerId` becomes
  `firingTriggerNames`, `parentFolderId` becomes `parentFolderName`, etc.
- Parameter lists are sorted by `key` except for a few known order-significant
  lists (e.g. ecommerce `items`, `impressions`, `promotions`).
- Built-in variables are keyed by `type`.

If a trigger, folder, or tag is renamed, the diff shows one `removed` and one
`added` entry — same as Git. If you want to track a rename, do it as a
deliberate change.

## CI example

```yaml
# .github/workflows/gtm-diff.yml
name: GTM diff
on:
  pull_request:
    paths: ['gtm/**/*.json']
jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Produce diff
        # Swap for `npx gtm-diff` once the package is published.
        run: |
          git show origin/${{ github.base_ref }}:gtm/container.json > /tmp/before.json
          npx github:arcbaslow/gtm-diff diff /tmp/before.json gtm/container.json \
            --format markdown --output diff.md
      - name: Post as PR comment
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: diff.md
```

## Roadmap — `plan` and `apply`

`gtm-diff plan` and `gtm-diff apply` are intentionally not yet available.
Shipping `apply` without safety rails could wipe production tracking for
someone's company. Read the full reasoning in the commit history and the
[Phased scope](#status) table.

When they ship, `apply` will:

- Require you to **bring your own OAuth client**. Google OAuth verification
  for `tagmanager.edit.containers` takes 3–8 weeks and a registered business;
  BYO client is the official pattern (same as `gcloud`, `terraform-provider-google`).
- Default to dry-run. The `--apply` flag is required for real writes.
- Operate in a **new workspace**, never on your live container. Publishing
  stays manual.
- Follow the only safe order of operations:
  built-in variables → variables → triggers → tags → folders.
- Never delete a workspace, only create them.

## Programmatic use

The diff engine is exposed as a library:

```ts
import { loadGtmExport, diffExports, renderMarkdown } from 'gtm-diff';

const before = await loadGtmExport('before.json');
const after = await loadGtmExport('after.json');
const diff = diffExports(before, after);
console.log(renderMarkdown(diff));
```

## Development

```sh
npm install
npm run dev -- diff test/fixtures/minimal-before.json test/fixtures/minimal-after.json
npm test
npm run typecheck
npm run lint
```

## License

MIT © Dilshat Rakhimov

## Related

Part of a set of marketing-measurement toolkits:

- [google-ads-agents](https://github.com/arcbaslow/google-ads-agents)
- [google-analytics-agent](https://github.com/arcbaslow/google-analytics-agent)
- [google-search-console-agent](https://github.com/arcbaslow/google-search-console-agent)
- [meta-ads-agents](https://github.com/arcbaslow/meta-ads-agents)
- [figma-taxonomy-gen](https://github.com/arcbaslow/figma-taxonomy-gen)

Built and maintained by [Good Labs](https://goodlabs.kz).
