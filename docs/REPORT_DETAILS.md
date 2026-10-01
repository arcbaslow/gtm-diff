# Full details and bounded review comments

X7, 2026-10-01. Default console, Markdown, HTML and JSON output is unchanged.

## Full details

`--details` is available with `--format markdown` or `--format html`. Added and removed entities gain collapsed full normalized configurations; modified entity and metadata values are not abbreviated. The library equivalent is `renderMarkdown(diff, { full: true })` or `renderHtml(diff, { full: true })`. Full data remains subject to normal comparison rules; original volatile IDs are not restored.

All new configuration HTML is escaped with `escapeHtml` after control-safe JSON formatting. Report data remains inert. Opt-in details can expose more secrets from the input than the default name-only added/removed lists. Select the artifact destination explicitly.

## Bounded Markdown

`--max-report-bytes 60000` enables a bounded Markdown comment with the stable first-line marker `<!-- gtm-diff:report:v1 -->`. The budget counts UTF-8 bytes, including the marker, final newline and optional artifact link. The minimum is 1024 bytes. This is a caller-selected budget, not a promise about a particular hosting service's limit. The library equivalent is `{ maxBytes: 60000 }`.

When the complete report fits, it is retained. Otherwise the report becomes a complete compact summary: entity counts, metadata-change count, coverage status, and an explicit statement that source labels and details were omitted. It never cuts through a code fence, HTML element, character or entity. Coverage field names may be omitted with the details, but incomplete coverage is always stated. Matching/order/counts and exit status are unaffected.

Supply `--artifact-url https://example.invalid/full-report` (library `artifactUrl`) to link to a full artifact produced separately. Only HTTPS URLs without embedded credentials or controls are accepted. The URL is HTML-escaped; it is never fetched. A URL that cannot fit with the compact summary is an error, not silently dropped. This option requires a byte budget. Invalid format/option combinations return status 2.

```bash
node bin/run.js diff before.json after.json --format html --details --output full.html
node bin/run.js diff before.json after.json --format markdown --details --max-report-bytes 60000 --output comment.md --exit-code
```

The tool creates no comments and uploads no artifacts. An external integration can identify a comment by the exact first-line marker, scoped to its own author and review context. It must not search untrusted body values for arbitrary matching marker text. A separate integration must supply a real artifact URL if it wants a link; the CLI cannot infer one.

Tests cover hostile full configurations, complete and compact output, UTF-8 boundaries, invalid URLs, long artifact URLs, coverage preservation and CLI statuses. Snapshots cover new rendering and unchanged output under input permutations. Existing default report snapshots are unchanged. Browser rendering on GitHub is not verified by these string tests.

Sources: [GitHub collapsed sections](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections), [workflow summaries](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary). Byte-budget and summary-fallback behavior are this project's explicit design choices.
