# Releasing GTM Diff

## Prepare

1. Start from a clean checkout of the intended release commit.
2. Update `package.json` and the root package entry in `package-lock.json` together, and add a dated entry to `CHANGELOG.md`.
3. Update `docs/RELEASE_NOTES.md`, refresh affected examples/screenshots and run every check in the README. For Google Ads, include the separate webapp suite; for GA4, include coverage, format and mypy.
4. Build and inspect the artifacts. Run the documented offline example against the source you are releasing.

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run format:check
npm pack
```

## Publish

Commit and push the tested source, then choose an unused tag matching the package version. Do not move an existing release tag. The following is an example for this version; future releases must use their own version:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --verify-tag --title "v0.1.0" --notes-file docs/RELEASE_NOTES.md
```

Attach the reviewed source bundle and its `SHA256SUMS.txt`; attach installable package artifacts only after checking their contents and entry points. Use the README's source installation for the full agent/skill workflow.

## Automation

Publishing a GitHub Release triggers `release.yml`. It validates the version, runs the checks, creates the npm tarball and uploads a workflow artifact. npm publication runs only when `PUBLISH_TO_NPM` is `true`.

The repository's [release workflow](../.github/workflows/release.yml) is the source of truth. Preserve existing publishing settings unless a registry release is explicitly intended. Wait for the default-branch CI run to pass before creating a stable release.

For workflows that expose `workflow_dispatch`, the `tag` input is checked against the dispatched branch's package version. Dispatch from the intended release ref when retrying a build. Do not assume that typing an old tag selects its source in every workflow.
