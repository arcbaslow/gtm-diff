# Comparison coverage

The normalizer compares container metadata and the entity collections listed by `ENTITY_KINDS` in `src/types/gtm.ts`. Unknown fields within compared entities are retained. This is structural export comparison, not validation of tracking behavior.

## Resource identities and normalization

All ten collections documented by the API v2 ContainerVersion resource are compared. Their report order is tags, triggers, variables, folders, built-in variables, clients, transformations, custom templates, zones and Google tag configs. The five new rows append to the existing summary order. Fields and identities sort by code-unit order; parameter lists retain authored order.

The following API references were checked on 2026-09-30. Fixtures are synthetic examples of these documented shapes, not a claim to have verified fresh UI exports.

| Collection | Identity and comparison policy | Source |
| --- | --- | --- |
| `client` | Type and name; strip `clientId` and environment metadata. Compare numeric priority, notes and parameters, sorting keyed parameters/maps and retaining lists. Resolve parent folders with the existing folder-name policy. | [Client](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.clients) |
| `transformation` | Type and name; strip `transformationId` and environment metadata. Normalize keyed parameters/maps and parent folders; preserve `isWeakReference`. | [Transformation](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.transformations), [Parameter](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/Parameter) |
| `customTemplate` | Name with the existing `<no-type>` sentinel when type is absent; strip `templateId` and environment metadata. Compare `templateData` exactly as inert text and retain gallery version, signature, developer/template IDs and unknown fields. | [CustomTemplate](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.templates) |
| `zone` | Name with `<no-type>` when type is absent; strip `zoneId` and environment metadata. Canonicalize boundary condition sets and resolve/sort `customEvaluationTriggerId` as `customEvaluationTriggerNames`. Preserve child-container public IDs/nicknames, type restrictions and unknown fields. Other array ordering remains significant. | [Zone](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.zones) |
| `gtagConfig` | Type plus nonempty `gtagConfigId`. The resource has no documented name. Two configs of the same type remain separate; changing the ID produces removed plus added. Normalize parameters, remove environment metadata and move the source ID into the identity key. No guessed cross-environment matching. | [GtagConfig](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.gtag_config) |

Named-resource renames remain removed plus added. Duplicate identities and source IDs fail validation. New collection arrays, names/types, source IDs, parameter trees, parent-folder IDs, client priority, template text and consumed zone-boundary structures are validated before normalization. Unknown fields remain data, rather than being interpreted as code or silently discarded.

`resources-before.json` / `resources-after.json` demonstrate a change in each new collection, including client priority, weak references, template text/gallery versions, zone boundaries/restrictions and Google tag config parameters. Snapshots test field and report order; permutation tests cover entity, object, map and condition order. Hostile labels are tested for every new kind in every change status.

## Reference limits

Folder IDs absent from a partial export remain their raw ID; missing zone evaluation triggers render as `<unresolved:ID>`, consistent with existing trigger-array behavior. Unknown extension fields remain exact structural data. X2 now resolves Parameter trigger references by target type/name and preserves explicit unresolved IDs; see the [Parameter contract](PARAMETERS.md). Tag-reference values remain names. Template-backed type identifiers are compared literally; template-ID relocation can therefore appear as removed plus added even when the template name is unchanged. No inferred template syntax or rename matching was added. Template-reference rules still need real redacted fixtures.

Zone child-container and whitelist array ordering is preserved pending evidence for different semantics. Gallery IDs/signatures and child-container public IDs are retained because they identify referenced content rather than the local export environment. None of these reference limits are classified as omitted fields: their values are compared, though raw IDs may introduce noise. Strict mode does not certify cross-environment semantic equivalence.

The library exports the five new resource types and `gtagConfigIdentity` for the nameless resource. `identityKey` remains the named-entity helper. `normalizeExport` supplies maps for all ten kinds; `diffNormalized` treats absent new-kind maps in older normalized objects as empty. Human-readable reporters retain their existing abbreviated object values and name-only added/removed sections; full human-report detail design remains X7. The [JSON report](JSON_REPORT.md) includes full normalized changed entities and untruncated values.

## Omitted fields and strict mode

Other fields directly under `containerVersion` are listed in an incomplete-comparison notice, sorted by their original field names. Empty unknown arrays are ignored because they contain no entities; unknown scalar, object and null values are reported. The notice identifies fields on each side even when their values are identical. Their contents are not compared or included in report values.

Version-level `path`, `accountId`, `containerId`, `containerVersionId`, `name`, `deleted`, `description`, `fingerprint` and `tagManagerUrl` are intentionally excluded and do not produce notices. The export envelope is also excluded. This preserves the existing comparison policy. The documented version fields come from the [ContainerVersion resource](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.versions), checked on 2026-09-30.

Human-readable formats display the notice. With omissions and no detected changes, the result says “No changes in compared fields.” JSON instead records `coverage.complete: false` and the original omitted names in `coverage.omittedFields`; `hasChanges` still describes compared fields only. By default the exit-code contract still counts only detected changes. `--strict` instead returns 2, writes a diagnostic to stderr, and neither creates nor overwrites the report. This takes precedence over `--exit-code` returning 1. Strict mode is not a complete schema validator: it checks omitted version fields, while existing parser validation checks structures used by normalization.

Library callers receive optional `omittedFields` on `NormalizedContainer` (a sorted field-name array) and `ContainerDiff` (`{ before: string[], after: string[] }`). The property is absent when no omissions were found. `hasChanges` counts compared differences only; callers needing strict coverage must also check `omittedFields`. Raw library field names remain exact; built-in reporters sanitize or escape them on output. Callers of `diffNormalized` must carry forward normalization's omission information.

The synthetic `coverage-before.json` / `coverage-after.json` fixtures demonstrate changed unknown fields, including a hostile field name. Regression tests cover notices, stable ordering, HTML escaping, terminal controls, strict exit status and preservation of an existing output file. No live GTM exports or network requests are used.
