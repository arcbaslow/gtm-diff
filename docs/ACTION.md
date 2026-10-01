# GitHub Action

X6. The root `action.yml` is a composite Action for Ubuntu/Windows runners with Bash. Pin this repository to a reviewed commit containing the Action. It runs setup-node, `npm ci` and build in the Action checkout, then compares two local files in the caller's workspace. Setup/install may access GitHub and the npm registry. The comparison adapter, CLI and fixture tests make no network calls.

No npm publication is required. The Action does not check out the caller's repository, fetch a baseline, upload artifacts, post comments or request GTM credentials. It needs no write token. Never run untrusted pull-request code in a privileged `pull_request_target` workflow to generate a report.

## Inputs and outputs

| Input | Default | Meaning |
| --- | --- | --- |
| `before`, `after` | Required | Local paths, relative to the workspace or absolute |
| `node-version` | `24` | Use the supported Node 20, 22 or 24 line |
| `strict` | `true` | Reject omitted container-version fields before report creation |
| `fail-on-change` | `false` | Fail the step after reports/output paths are written if changes exist |
| `details` | `false` | Include full normalized configurations in HTML/Markdown |
| `summary` | `true` | Append counts and coverage status to the job summary; no container strings or field values |

Boolean inputs accept only `true` or `false`. Inputs are passed as environment values, never interpolated into shell source. The Action pins setup-node to an official commit. Dependabot already tracks Actions and npm dependencies.

Successful comparisons expose `has-changes`, `complete`, and `exit-code` (0 for unchanged, 1 for changes), independently of `fail-on-change`. `report-directory` is a fresh directory under `RUNNER_TEMP`; `report-json`, `report-markdown`, `report-html` and `report-comment` are file paths. The comment file uses the stable marker and a 60,000-byte budget. Reports are deterministic; their temporary directory names are deliberately unique.

Operational errors fail with process status 2 and do not expose success outputs. No report paths are emitted until rendering and writing succeeds. Strict failures create no report directory. A filesystem failure may leave partial files in a fresh runner-temporary directory; they are not advertised as successful artifacts. The Action does not reuse or overwrite old reports.

## Example

Replace `<reviewed-commit-sha>` with the full commit ID of this repository version after review. The placeholders below are deliberately not a floating branch or an uncreated release tag. Supply the two exports before the comparison step.

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
  - uses: arcbaslow/gtm-diff@<reviewed-commit-sha>
    id: diff
    with:
      before: exports/before.json
      after: exports/after.json
      fail-on-change: 'false'
  - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7
    if: always() && steps.diff.outputs.report-directory != ''
    with:
      name: gtm-diff
      path: ${{ steps.diff.outputs.report-directory }}
      retention-days: 7
```

When `fail-on-change` is true, keep the `always()` condition to retain reports after drift failures. A status-2 failure produces no report-directory output, so an old artifact is not uploaded accidentally. Review retention and repository artifact access because full report data may contain secrets. A comment-posting integration must be configured separately; this Action does not grant or use comment permissions.

## Verification and sources

Offline adapter tests use existing hostile, coverage, malformed and normal fixture pairs. They verify report contents, aggregate-only summaries, output protocol, drift failure after writing, strict failure before writing, unique output directories and explicit boolean handling. The repository test workflow exercises the composite itself in its Ubuntu/Windows Node 20/22/24 matrix. Hosted verification for the new branch is recorded separately from these local tests.

Sources checked 2026-10-01: [composite actions](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action), [workflow outputs and summaries](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands), [commit pinning and token permissions](https://docs.github.com/en/actions/reference/security/secure-use). Source fetching and artifact uploads are workflow responsibilities; offline comparison is the product contract.
