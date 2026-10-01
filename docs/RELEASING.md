# Releasing GTM Diff

## Prepare

1. Start from a clean checkout of the intended release commit.
2. Update `package.json` and the root package entry in `package-lock.json` together, and add a dated entry to `CHANGELOG.md`.
3. Update `docs/RELEASE_NOTES.md`, refresh affected examples/screenshots and run every check in the README.
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

Attach installable package artifacts only after checking their contents and entry points. The README documents source installation and offline CLI/library usage.

## Automation

Publishing a GitHub Release triggers `release.yml`. It validates the version, runs the checks, creates the npm tarball and uploads a workflow artifact. npm publication runs only when `PUBLISH_TO_NPM` is `true`.

The repository's [release workflow](../.github/workflows/release.yml) is the source of truth. Preserve existing publishing settings unless a registry release is explicitly intended. Wait for the default-branch CI run to pass before creating a stable release.

For `workflow_dispatch`, choose a workflow revision containing the release fixes and supply an existing tag such as `v0.1.0`. Build checks out `refs/tags/<tag>`, for both manual and release events, and validates that checkout's package version. Publish checks out the exact commit recorded by the successful build job, so a subsequently moved tag cannot switch the source between jobs. Do not move release tags. No workflow was dispatched or package published while verifying these changes.

Sources: [manual dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch), [checkout ref](https://github.com/actions/checkout#usage), [job outputs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs). Checkout, expression and job-output wiring can be checked offline with actionlint; an actual publish requires a separately authorized release.
