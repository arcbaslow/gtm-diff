# JSON report contract

`diff --format json` emits one JSON object with numeric `schemaVersion: 1`. This version belongs to the report format, independently of the package version. CI consumers should check it before interpreting the report. Incompatible changes to the documented structure or field meanings require a new schema version; consumers should tolerate additional object properties. GTM entity data remains extensible under the existing [normalization](PARAMETERS.md) and [coverage](COVERAGE.md) policies.

```bash
node bin/run.js diff before.json after.json --format json --output diff.json --exit-code
```

Without `--output`, stdout contains only the JSON report and a final newline. With `--output`, the UTF-8 file contains the report without a trailing newline, and stdout contains the usual sanitized file acknowledgement. Errors remain plain diagnostics on stderr, with status 2 and no JSON error envelope. `--no-color` has no effect on JSON. Status 1 is returned only after the report is written; differences without `--exit-code` still return 0. `--strict` rejects coverage omissions before creating or overwriting a report. See [CI status handling](CI.md).

## Version 1 fields

Every top-level field below is present, including empty arrays and zero counts. The public library exports `renderJson(diff)`, `JsonReportV1`, `JsonEntityChange` and `JsonFieldChange` from `src/index.ts` (or `dist/index.js` after building).

| Field | Meaning |
| --- | --- |
| `schemaVersion` | The number `1` |
| `source.label`, `target.label` | Display labels with C0/C1 controls and Unicode line separators removed by `sanitizeLabel`. The CLI supplies input basenames; the library uses caller labels, defaulting to `before` and `after`. Labels are not identities or HTML-safe strings |
| `hasChanges` | True when any compared entity or container metadata changed, independently of CLI flags. Omissions alone do not count as changes |
| `coverage.complete` | True when neither side has omitted container-version fields. This does not certify GTM validity, tracking behavior, or semantic equivalence across environments |
| `coverage.omittedFields.before`, `.after` | Sorted arrays of original omitted field names, preserving their exact strings after JSON parsing. Empty arrays are explicit. Omitted values are not included |
| `summary` | Entity counts: `added`, `removed`, `modified`, `unchanged`. Container metadata changes are excluded from these counts |
| `containerMeta` | Field changes in normalized container metadata, using the field-change structure below |
| `kinds` | All ten entity groups, including empty groups: `tag`, `trigger`, `variable`, `folder`, `builtInVariable`, `client`, `transformation`, `customTemplate`, `zone`, `gtagConfig` |

Each group contains `kind`, arrays `added`, `removed`, `modified`, and an `unchanged` count. Unchanged entities are counted but not included. Each changed entry contains `kind`, the original comparison `key`, and `status` (`added`, `removed` or `modified`). Treat `key` as an opaque identity under the [existing matching policy](COVERAGE.md); do not split it to obtain a display name. Renames remain removed plus added.

Added and removed entries have a full normalized `entity`. Modified entries have full normalized `before` and `after` objects plus `fieldDiffs`. No string, object or array value is truncated. Entity names and types in these data objects and identity keys remain exact, including controls, after JSON parsing.

| Field-change `type` | Required fields |
| --- | --- |
| `CREATE` | `path`, `value` |
| `REMOVE` | `path`, `oldValue` |
| `CHANGE` | `path`, `oldValue`, `value` |

`path` is an array of string object keys and numeric array indices relative to the normalized entity or container metadata. A field literally named `a.b` stays one string segment; it is not dotted-path notation. Missing sides are absent properties, distinct from a present value of `null`. Values keep their JSON types, including booleans, numbers, nulls, arrays and objects.

## Data and escaping

The report preserves normalized JSON data, not the original export bytes. Normalization still removes volatile IDs and excluded metadata, resolves supported references, and orders documented unordered collections. Numbers retain the existing JavaScript parsing semantics; original numeric spelling and arbitrary precision are not preserved, and negative zero serializes as zero. Non-finite numbers in report data raise a rendering error instead of silently becoming null. Library callers must supply JSON-compatible data; undefined, bigint, symbols and functions are unsupported. The format is a comparison report, not an import file, backup or executable plan.

Serialization uses JSON escaping for quotes, backslashes and C0 controls. It also uses reversible `\uXXXX` escapes for `<`, `>`, `&`, apostrophes, DEL/C1 controls and U+2028/U+2029 in every string and property name. Every serialized line then passes through `sanitizeLabel`; only generated formatting newlines remain. Source/target display labels are the only strings deliberately sanitized before serialization. [RFC 8259 section 7](https://www.rfc-editor.org/rfc/rfc8259.html#section-7) permits these escapes; parsing recovers the original data characters.

Parse with a JSON parser. Never execute report contents or use `eval`; see [RFC 8259 section 12](https://www.rfc-editor.org/rfc/rfc8259.html#section-12). After parsing, strings are untrusted again. Consumers rendering them must escape for their destination: HTML escaping or text nodes for HTML, appropriate Markdown escaping for Markdown, and control-safe formatting for terminals. Prototype-named keys such as `__proto__` remain ordinary data; do not merge parsed objects into privileged configuration. Reports contain full changed entities and can contain secrets from the exports; select storage and sharing destinations explicitly.

## Determinism

The same parsed inputs and labels produce the same report bytes. There are no timestamps, absolute input paths or runtime-version fields. The CLI labels still depend on input basenames. Object properties are canonicalized recursively (integer-index keys follow JavaScript numeric enumeration order, other keys use code-unit order). Kind order follows the table above; entries within each change status are ordered by identity key. Field changes retain the deterministic engine traversal order. Parameter lists and other order-sensitive arrays retain authored order. This is the repository's deterministic encoding, not a claim to implement a cryptographic JSON canonicalization standard.

## Verification

The synthetic `test/fixtures/json-report-{before,after}.json` pair covers added/removed entities, all three field-change types, null/false/numeric values, numeric path segments, long values, prototype-named keys, inert `toJSON` text and authored list changes. Existing hostile, coverage, resource and normalization fixtures cover the remaining contexts. Tests check round trips, every new string output context, metadata-only and incomplete comparisons, stdout/file behavior, statuses 0/1/2 and strict-mode file preservation. A JSON snapshot and object/entity/map permutation snapshot record deterministic bytes; existing human-report snapshots remain unchanged.

Starting commit: `27ea024`, Windows/Node 24.19.0. Offline `npm ci` succeeded. Baseline typecheck, lint and format checks passed. The first test run passed 159/160: the first CLI test exceeded Vitest's five-second timeout at 5.384 seconds. The unchanged rerun passed all 160 tests, then build passed. This timing sensitivity is recorded without changing unrelated timeout behavior.

Final checks on Windows/Node 24.19.0: typecheck, lint, format:check, all 185 tests in 11 files, and build pass. Test-source TypeScript checking and `git diff --check` also pass. The same 185 tests, including JSON and existing human-report snapshots, pass on Windows/Node 20.20.2 and 22.23.3. A built `bin/run.js` comparison returns status 1 and produces JSON byte-for-byte equal to the public library renderer plus the CLI newline. The `json-nonfinite` fixture pair verifies status 2 for an out-of-range number in report data. No runtime or development dependencies changed.

Ubuntu, hosted CI and fresh real GTM exports remain unverified. The branch push alone does not trigger the repository's main/PR workflow. No PR, package release, plan command or GTM write is part of X4.
