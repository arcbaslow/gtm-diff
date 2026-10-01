# Read-only plan design

Status: design for review, 2026-10-01. X5; no command is implemented. The owner requested designs before large implementations. Package v0.2 remains reserved for a read-only plan; v0.3 apply is outside this work.

## Purpose and boundary

Proposed command: `gtm-diff plan before.json after.json --output plan.json`. Before is the baseline; after is the desired local export. The command reads those two files and creates one plan file. It prints no success report, makes no network calls, reads no credentials and never changes GTM. Diagnostics go to stderr; success is 0, invalid or unsupported input is 2. There is no execute flag.

The file records reviewable intended changes, input provenance and unresolved questions. It is not an import payload or authorization for a future writer. Do not implement plan by serializing microdiff: normalization has removed source IDs and transformed references.

## Proposed file contract

The plan has `planFormatVersion: 1`, `mode: "review-only"`, a versioned normalization policy identifier, `inputs`, `operations` and `diagnostics`. This is a proposed version, not an existing supported format.

Each input contains a sanitized basename label, SHA-256 of the original bytes, byte count and container public ID when present. Hashing includes a BOM and whitespace; semantically equivalent differently formatted files may have identical operations but different provenance. No timestamp, absolute path or machine information is recorded.

Each operation contains:

- `action`: create, remove or update.
- `identity`: a structured kind/type/name tuple, or kind/type/source-ID for Google tag configs; never split the current delimiter-based comparison key.
- `baseline` and/or `desired`: complete original JSON entity data, with absence represented by a missing side. Volatile fields remain here for provenance, not as change triggers.
- `comparison`: normalized before/after and typed field paths, using a separately versioned comparison contract.
- `references`: explicit outgoing reference records containing source field path, original value, target identity when uniquely resolved, and resolution status.

Container metadata is a separate operation kind. Unchanged entities are absent from operations; referenced unchanged entities appear in an identity catalogue with source IDs from both inputs. The catalogue is necessary to explain cross-entity references without pretending normalized names are API identifiers.

Operations follow fixed kind order, then structured identity components in code-unit order, then action order remove/update/create for otherwise equal tuples. This is review order, not execution order. References and diagnostics sort by operation identity and typed path. Ordered arrays inside original data retain their order. Renames remain removed plus added.

## Validation and failure behavior

Use parser limits and shape checks before planning. Require complete comparison coverage by default. Reject ambiguous identities, ambiguous explicit references and unresolved required references with locations. Preserve unknown entity fields as opaque data; never interpret or execute embedded code. Template-backed type relocation and built-in reference conventions require real fixtures before defining a conversion.

The initial implementation should support planning within one container identity only. Conflicting nonempty public IDs fail; missing identity requires a documented decision before implementation. Cross-container mapping is a later design, not a guessed rename or ID rewrite.

Read and validate both inputs before opening the output. Refuse an output alias of either input, including symlinks/hardlinks where the platform exposes file identity. Refuse existing output; an overwrite option is excluded from the initial contract. Serialize the entire plan before exclusive file creation and remove the newly created file if writing fails. Readers must wait for successful command completion. This does not promise crash-atomic output: interruption can leave an incomplete file that the schema validator must reject. An atomic no-clobber commit mechanism requires separate cross-platform tests before it can replace exclusive creation; ordinary rename can overwrite an existing target. The only lasting successful output is the requested plan. Never emit a partial plan after validation failure.

Use the JSON reporter's reversible output-escaping policy for data and sanitize display labels. No truncation, HTML entities in data or execution of templates. Non-finite numbers fail. Hashes identify input bytes but do not certify safety or authenticity.

## Implementation steps and acceptance tests

1. Introduce a parsed-input structure retaining bytes/digest, raw entities and normalized identities without altering existing diff behavior.
2. Implement an independent pure plan builder and validator; retain raw and normalized data separately.
3. Add the read-only command with exclusive output creation and no success stdout.
4. Add schema documentation and a machine-readable schema; export the builder only after its contract is tested.
5. Test empty, metadata-only, all ten kinds, renamed, partial, ambiguous-reference and hostile inputs. Check exact file bytes, repeated runs, input permutations, hashes and unchanged inputs.
6. Test output aliases, existing output, write failures and interruption cleanup on Ubuntu and Windows. Assert the command opens no network connections and invokes no GTM adapter.
7. Review real redacted web/server/template/zone exports before calling the plan suitable for operational use.

Decisions still needing review: missing public IDs; whether non-required unresolved references may be diagnostics rather than fatal errors; size cost of retaining full before/after data; and how a future schema migration identifies normalization-policy changes. Do not silently choose these during implementation.

Evidence: `src/core/normalize.ts` removes IDs and resolves references; `src/core/diff.ts` exposes normalized changes; `docs/PARAMETERS.md` and `docs/COVERAGE.md` record unresolved semantic assumptions. [Google's import/export documentation](https://support.google.com/tagmanager/answer/6106997?hl=en) describes import choices that this offline plan must not imply it performs.
