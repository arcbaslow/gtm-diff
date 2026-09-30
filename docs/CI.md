# Using diff in CI

Build the checked-out tool with `npm ci` and `npm run build`. Supply two local export files; no GTM credentials or network access are needed by the command.

| Status | Meaning |
| --- | --- |
| 0 | Successful comparison; also used when differences exist without `--exit-code` |
| 1 | Successful comparison with differences and `--exit-code` |
| 2 | Diff argument, input, validation, rendering or output error |

Metadata-only changes count as differences. Unsupported collections are still omitted; see [coverage limits](../README.md#what-the-comparison-means). Status 0 is not proof that unsupported GTM resources are identical. Normal OS termination or a failure before the command loads is outside this contract.

Without `--output`, stdout contains the selected report. With `--output`, stdout contains a short file acknowledgement. Errors use stderr. Status 1 is returned only after the report is written. Report bytes depend on input basenames in the heading as well as export contents. If both inputs are invalid, the before input is validated first for a deterministic diagnostic.

For a Bash CI step that should keep a report when changes are expected:

```bash
status=0
node bin/run.js diff before.json after.json --format markdown --output diff.md --exit-code || status=$?
case "$status" in
  0) echo 'No differences in supported data' ;;
  1) echo 'Changes found; diff.md is ready for review' ;;
  *) exit "$status" ;;
esac
```

Upload `diff.md` as an artifact after this step. If changes should fail the job, preserve status 1 and configure artifact upload to run after a failed comparison step too. Do not interpret status 2 as an ordinary drift result or publish an old report from a previous run.

The Markdown report uses a summary table, lists and collapsed details. It can be selected as a PR comment body by a separately configured integration. The CLI does not send comments, access GitHub tokens or run network requests. Review the destination before sharing: reports can include secrets present in exports. JSON output and a reusable GitHub Action remain [roadmap proposals](ROADMAP.md).
