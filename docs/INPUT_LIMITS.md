# Input limits and fixture coverage

X8 implementation and remaining evidence, 2026-10-01.

## Resource contract

Local files are read in 64 KiB chunks and rejected after 32 MiB (33,554,432 bytes), including any leading BOM. Reading stops when the limit is crossed; the entire oversized file is not retained. This is a byte limit, not a character limit. A single initial UTF-8 BOM is accepted; embedded BOM characters remain data. Other malformed JSON still fails.

Before recursive parser/normalizer work, an iterative walk rejects more than 128 object/array nesting levels or 500,000 values. The root counts as one value; every member/array element counts as a value, and only objects/arrays contribute nesting levels. Library `validateGtmExport`, `normalizeExport`, `diffExports` and `diffNormalized` receive the structural limits. The file byte limit applies only to `loadGtmExport`. Cyclic library data hits the depth limit; JSON files cannot encode cycles.

Limits are fixed policy ceilings, not a claim about GTM's maximum export size or a hard total-process memory budget. JSON parsing, canonicalization and reporting still allocate memory. No silent truncation occurs. A limit failure produces CLI status 2 before writing a report. Inputs under the limits follow the same normalization and ordering rules. Raising the limits requires a measured workload and review; there is no flag that disables them.

## Tests and fixtures

`depth-limit-{before,after}.json` shows an ordinary export and an excessive unknown-field nesting case. `bom-{before,after}.json` differs only by an initial BOM. Tests exercise exact depth and byte boundaries, broad data, cyclic normalized library input, CLI errors, and 16 seeded permutations of existing resource fixtures. Generated large files contain fixture-derived JSON and padding; tests use no network or GTM account.

Existing synthetic pairs cover web tags, server clients, transformations, consent Parameters, templates, zones, partial/omitted collections, hostile reporter strings and prototype names. They establish implementation regressions, not real UI-export compatibility.

A local Windows/Node 24.19.0 measurement generated 5,000 uniquely named tags from `minimal-before.json`, changed the last tag's notes, and compared the two parsed exports. The input was 1,683,940 bytes; comparison took 125 ms and reported one modified entity. This single synthetic measurement does not set a timing guarantee or establish real-container limits. All five required checks pass with 192 tests; existing reporter snapshots are unchanged.

## Real-export intake

No fresh real exports were supplied. This part of X8 remains awaiting external evidence; do not label generated examples as real exports. A contributor can submit a minimal pair after removing API keys, credentials, domains, internal URLs, user data and business-specific code. Preserve the structure and references needed to reproduce the change. Review the diff of the fixtures themselves before committing.

Add a companion provenance note naming the container context (web/server), export method, approximate date, fields deliberately removed, consent/template/zone features represented, expected comparison, and permission to redistribute the redacted data. No customer or account identifier is required. Run every existing parser, normalizer and reporter test against the trimmed pair.

Open semantic questions remain unchanged until that evidence exists: template-backed type relocation, built-in trigger conventions, duplicate display names, empty versus absent fields and cross-container identity mapping. [Google documents partial container exports](https://support.google.com/tagmanager/answer/6106997?hl=en); that feature is why an incomplete reference graph must not be guessed into a complete one.
