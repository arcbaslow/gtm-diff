# Parameter comparison

X2 extends the existing keyed-map normalization and list preservation to documented singleton Parameter fields. It uses explicit schema paths shared by parsing and normalization, not a recursive search for arbitrary objects with a `type` property. Unknown extension fields and wrapper fields remain compared exactly.

## Documented locations

Sources checked on 2026-09-30:

- [Trigger](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.triggers): waitForTags, waitForTagsTimeout, checkValidation, uniqueTriggerId, eventName, interval, limit, selector, intervalSeconds, maxTimerLengthSeconds, verticalScrollPercentageList, horizontalScrollPercentageList, visibilitySelector, visiblePercentageMin, visiblePercentageMax, continuousTimeMinMilliseconds and totalTimeMinMilliseconds.
- [Tag](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.tags): priority, monitoringMetadata and consentSettings.consentType. Consent status is retained. Consent lists keep their authored order; this change does not introduce consent-policy checks.
- [Variable](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.variables): formatValue.convertNullToValue, convertUndefinedToValue, convertTrueToValue and convertFalseToValue. Other conversion settings are preserved unchanged.

Existing parameter arrays, trigger condition arrays, zone conditions and nested lists/maps use the same Parameter normalizer. Keyed parameters and maps sort by key; lists remain positional. Missing singleton keys are allowed, but present structures must have a string type and valid nested Parameter shapes. Singleton roots and list items do not require keys; map entries do. Malformed wrappers or Parameters produce a validation error with their location (CLI status 2).

## Trigger and tag references

Google's [Parameter reference](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/Parameter) defines trigger references as IDs and tag references as names. The enum table spells the trigger type `triggerReference`; its descriptive text uses `trigger_reference`. The normalizer accepts these spellings and the explicit uppercase `TRIGGER_REFERENCE` spelling, with synthetic coverage for all three. It preserves the original type text and does not apply general case folding.

Within recognized Parameter locations, a trigger-reference value resolves only through an explicit trigger ID present in that same export. Its normalized `value` is:

```json
{ "trigger": { "type": "customEvent", "name": "Ready" } }
```

Missing targets retain their exact ID with a distinct shape:

```json
{ "unresolvedTriggerId": "2147479553" }
```

This avoids confusing unresolved IDs with authored names, and keeps targets with the same name but different types distinct. There is no heuristic matching. Relocating a source ID to another export with the same target type/name is unchanged; switching the target type/name is a modification. A recognized trigger-reference Parameter must supply a string value. Weak-reference flags and unknown fields are retained. Ordinary template strings, tag-reference names, setup/teardown tag names and Parameter-shaped unknown fields are never interpreted as IDs.

These normalized objects are comparison data, not GTM exports. Library consumers of `normalizeExport` or `ContainerDiff` must allow the structured `value` for trigger references. All built-in reporters use their existing escaped value/path rendering. No network requests or export execution are involved.

## Conservative limits

Special built-in trigger IDs absent from the export remain unresolved, and missing versus resolved targets remain distinguishable. No hard-coded built-in ID table is inferred. The existing name-only normalization for firing/blocking/enabling/disabling arrays and zone evaluation arrays is unchanged; its ambiguous-name policy remains a roadmap question.

Template-backed type identifiers remain literal pending real fixtures. Generated values such as uniqueTriggerId are preserved unless explicitly represented as a recognized trigger-reference Parameter. Absent versus empty fields and ordering of consent lists remain unchanged. The parser validates consumed structures, not every semantic constraint of a specific GTM field.

## X2 verification

Started from `38723a3` on `roadmap-work`, Windows with Node 24.19.0. All five baseline checks passed, with 120 tests. The `parameter-locations-before.json` / `parameter-locations-after.json` regression initially reported changes despite only map-order and trigger-ID relocation differences; it now reports no changes. These fixtures deliberately exercise the general Parameter structure, not every field's runtime type constraints.

Tests cover every documented singleton path, malformed structures, real consent/priority/trigger/conversion changes, references across all seven kinds that consume Parameters, recursion, weak references, unknown fields, unresolved IDs, same-named targets, source immutability, hostile values and command exit status. Snapshot and object-order permutation checks cover deterministic reports; pre-existing snapshots are unchanged. All five final checks passed with 160 tests in 10 files, and test-source TypeScript checking passed separately.

No dependencies or package version changed. No fresh UI exports, live GTM behavior, Node 20/22, Ubuntu or hosted CI results were verified locally. Real redacted fixtures and template/built-in reference conventions remain open questions; X3 and later tasks were not started. The owner authorized pushing the completed branch in this run; no PR, tag or publication is part of that instruction.
