# Comparison coverage

The normalizer compares container metadata and the entity collections listed by `ENTITY_KINDS` in `src/types/gtm.ts`. Unknown fields within compared entities are retained. This is structural export comparison, not validation of tracking behavior.

Other fields directly under `containerVersion` are listed in an incomplete-comparison notice, sorted by their original field names. Empty unknown arrays are ignored because they contain no entities; unknown scalar, object and null values are reported. The notice identifies fields on each side even when their values are identical. Their contents are not compared or included in report values.

Version-level `path`, `accountId`, `containerId`, `containerVersionId`, `name`, `deleted`, `description`, `fingerprint` and `tagManagerUrl` are intentionally excluded and do not produce notices. The export envelope is also excluded. This preserves the existing comparison policy. The documented version fields come from the [ContainerVersion resource](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.versions), checked on 2026-09-30.

All report formats display the notice. With omissions and no detected changes, the result says “No changes in compared fields.” By default the exit-code contract still counts only detected changes. `--strict` instead returns 2, writes a diagnostic to stderr, and neither creates nor overwrites the report. This takes precedence over `--exit-code` returning 1. Strict mode is not a complete schema validator: it checks omitted version fields, while existing parser validation checks structures used by normalization.

Library callers receive optional `omittedFields` on `NormalizedContainer` (a sorted field-name array) and `ContainerDiff` (`{ before: string[], after: string[] }`). The property is absent when no omissions were found. `hasChanges` counts compared differences only; callers needing strict coverage must also check `omittedFields`. Raw library field names remain exact; built-in reporters sanitize or escape them on output. Callers of `diffNormalized` must carry forward normalization's omission information.

The synthetic `coverage-before.json` / `coverage-after.json` fixtures demonstrate changed unknown fields, including a hostile field name. Regression tests cover notices, stable ordering, HTML escaping, terminal controls, strict exit status and preservation of an existing output file. No live GTM exports or network requests are used.
