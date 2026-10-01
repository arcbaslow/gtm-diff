# Future apply boundary

Status: deferred, prohibited in this work. L1 is covered as a boundary and prerequisite record, not an implementation.

The original owner constraints forbid an apply command, GTM writes, credentials, network paths and apply scaffolding. The later request to cover the roadmap retains that boundary. No apply code, API adapter or credential support is added.

Before a separate v0.3 proposal: gain operational experience with real-container diffs; review and implement the v0.2 read-only plan contract; define reference and concurrency validation using original identifiers; and decide what stale or incomplete plans must reject. A plan's input digest is not evidence that a remote container is unchanged.

Any later authorized design must preserve the conditions in SECURITY.md: bring-your-own OAuth client, dry-run by default, changes only in a new workspace, no publication and no workspace deletion. It must define interruption handling and a reviewable result before requesting any actual write. None of those requirements authorizes work on a writer now.

No estimate or completion claim is made for applying a plan. The next decision is a separately authorized design after the prerequisites, not a hidden flag on diff or plan.
