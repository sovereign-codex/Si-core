# Phase 3 — Sovereign Codex Monorepo Migration Plan

Phase 3 finalises the Sovereign Codex migration by importing **every** repository
from the `sovereign-codex` GitHub organisation into the Si-core monorepo. The
process is now fully automated through `scripts/monorepo-import.sh`, which uses
the GitHub API to enumerate repositories, detect their default branches, and add
them to the workspace via full-history `git subtree` operations.

## Repository Mapping (auto-generated)

The table below is updated each time the import script runs. Every repository is
categorised into the default monorepo layout (`apps/`, `packages/`, `docs/`,
`scripts/`, `infra/`, or `archive/`).

| Repository | Monorepo Path | Status | Default Branch | Notes |
| --- | --- | --- | --- | --- |
<!-- BEGIN MONOREPO-IMPORT TABLE -->
| _No repositories discovered._ |  |  |  |  |
<!-- END MONOREPO-IMPORT TABLE -->

## Import Sequencing

1. Trigger the **Phase 3: Import ALL repos (full history)** workflow dispatch or
   run `bash scripts/monorepo-import.sh` locally with a `GH_PAT` token that can
   read the organisation.
2. The script enumerates repositories, determines category placement, and runs
   `git subtree add` (or `git subtree pull` for updates) without `--squash` so
   full history is preserved.
3. Repository metadata is written to `codex-import-map.json`, and the README
   index is refreshed at `docs/INDEX.md`.
4. Commit the changes on branch `codex/import-all-repos` and open/refresh the PR
   titled **"Phase 3: Import ALL repos (full history)"**.

## Operational Notes

- README merge policy: each imported repository keeps its `README.md` in-place.
  The script adds a relative link in `docs/INDEX.md` so documentation consumers
  can browse every project from a single entry point.
- Classification heuristics: repository metadata (name + topics) guides
  placement. Archived repositories are automatically routed to `/archive`.
- CI guardrails: quality checks skip when the workspace is empty, ensuring the
  monorepo stays green before the first import lands.
