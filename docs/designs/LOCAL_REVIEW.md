# Local review and policy design

Status: design for review, 2026-10-01. L3; no new UI or policy engine is implemented.

## Local review

Extend the existing standalone HTML artifact with optional search and kind/status filters. Keep a useful static report when scripting is disabled. Start with filtering pre-rendered escaped text; do not embed export-supplied code, execute templates, fetch assets, start a server or require a login.

The only script is a fixed repository-authored file inlined at build time. It reads existing DOM text and toggles visibility. It must never pass export text to innerHTML, script elements, selectors or event-handler attributes. Use generated numeric section IDs and textContent for any labels. Add a restrictive content security policy with hashes for the fixed script/style and no network sources.

Search is a local substring match over displayed labels and field text. It must not change report order, counts or the underlying comparison. Hidden-result counts distinguish filtering from truncation. Full-value search is available only when full details were explicitly included; the artifact never promises to search omitted data.

Acceptance tests: unchanged order after filtering/reset; keyboard operation and visible focus; empty result state; disabled scripting; malicious names, field keys, controls and closing-script text; no network requests when opening the artifact. Browser rendering must be tested before shipping, separately from string snapshots.

## Optional policy checks

Policies are a separate explicit input, not inferred from a container and not enabled by default. Proposed JSON rules have an ID, applicable kind, exact field path, a small operator enum (exists, equals, oneOf) and a severity. No JavaScript expressions, regular-expression evaluation or dynamic imports. Reject unsupported operators and duplicate rule IDs.

Produce a separately versioned assessment containing rule ID, entity identity, field path, outcome and completeness. Do not change the factual diff or classify a container as legally compliant. Consent requirements depend on context that exports alone do not establish.

Keep exit status separate from diff's 0/1/2 contract: a future check command needs its own explicit contract before implementation. Do not post results or transmit configuration. Rule files can contain sensitive values; reports should show rule IDs/paths by default, with value disclosure opt-in.

Acceptance tests: invalid policies fail before output; deterministic ordering; missing versus null fields; wildcard-free exact paths; hostile rule/entity labels; unsupported resources generate incomplete assessment; no container code runs. Evaluate this against actual user review needs before building a general rules language.

Evidence: `src/reporters/html.ts` is currently static and escaped; `SECURITY.md` forbids export execution and transmission. [Google consent settings](https://support.google.com/tagmanager/answer/10718549?hl=en) describe configuration inputs, not a complete policy judgment for this tool.
