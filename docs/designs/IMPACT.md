# Explicit dependency and impact design

Status: design for review, 2026-10-01. L2; no impact engine is implemented.

## Question answered

For a changed entity, list entities with explicit references that could be affected. This is a structural dependency explanation, not a claim that tracking will fail or that all runtime dependencies are known.

## Graph contract

Use structured identities from original exports, with separate before and after graphs. An edge records source identity, target identity when uniquely known, typed source field path, relation and resolution status (resolved, unresolved or ambiguous).

Initial relations: tag firing/blocking trigger arrays; variable enabling/disabling trigger arrays; zone evaluation triggers; Parameter triggerReference; Parameter tagReference; setup/teardown tag names; and parent-folder membership. Keep folder membership distinct from execution dependency so moving a folder does not imply a behavioral dependency.

ID references resolve against original IDs before normalization. Name references resolve only when the name is unique in the appropriate entity kind. Duplicate candidate names remain ambiguous. Missing targets retain raw IDs/names as inert data. Match before and after identities with existing exact rules; do not infer renames.

Do not extract references from arbitrary JavaScript, Custom HTML, template code, string interpolation, unknown extensions or template-backed type strings in this first version. These omissions must be explicit in the coverage result.

## Traversal and output

For each changed identity, reverse-traverse execution edges to find potential dependents. Use a visited set to terminate cycles. Report direct edges separately from transitive paths. Sort roots and neighbors by kind and structured identity; use deterministic shortest paths when several paths reach the same node. Apply explicit node/edge/path limits and emit a completeness flag when a limit is reached.

Proposed separate JSON document: graph format version, graph coverage, changed roots, edges, potential dependents and diagnostics. Do not silently extend JSON report version 1 with implied impact guarantees. A later human view can link identities to existing report sections using generated numeric IDs, never container strings as executable selectors.

Acceptance corpus: a tag-trigger-variable chain, a cycle, duplicate names, missing triggers from a partial export, before-only/after-only edges, folder moves, tag references with hostile names, and reordered equivalent exports. No live container or code execution belongs in the tests.

Remaining decision: whether to report only transitive dependents or include unchanged intermediate nodes in the default view. Benchmark dense graphs before choosing default graph limits. Real fixtures are required before adding reference interpretation beyond documented fields.

Evidence: `src/core/normalize.ts:buildReferenceIndex`; `src/core/parameter-fields.ts`; [Parameter reference types](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/Parameter); [Tag resource](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.tags).
