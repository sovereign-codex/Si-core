# Phase 2 — Sovereign Codex Monorepo Migration Plan

Phase 2 prepares the Si-core monorepo to absorb every public repository from the `sovereign-codex` GitHub organisation. Because the execution environment cannot reach github.com, the inventory below captures the known catalogue based on internal manifests and workspace packages. Default branches are inferred from current conventions (`main` for active repositories).

## Repository Mapping

| Repository | Monorepo Path | Status | Default Branch | Notes |
| --- | --- | --- | --- | --- |
| avot | packages/avot | active | main | Core Avot SDK that other agents consume. Import as a standalone package workspace. |
| avot-convergence | packages/avot-convergence | active | main | Agent implementation built on Avot. Keep separate so releases remain independent. |
| docs | docs/docs | active | main | Documentation sources and automation scripts. Will sit under `/docs` beside generated reference material. |
| lattice | packages/lattice | active | main | Shared lattice primitives referenced by automation tooling. |
| manifests | packages/manifests | active | main | Distribution of schema and manifest utilities. |
| shared-utils | packages/shared-utils | active | main | Cross-cutting utilities shared by multiple packages and apps. |
| si-console | packages/si-console | active | main | Developer console CLI; retains workspace links to other packages. |
| si-core | packages/si-core | active | main | Core service APIs. Import over the existing stub once repositories converge. |

> **Note:** Repositories not listed here could not be discovered offline. Update this plan and `codex-import-map.json` once additional sources are identified.

## Import Sequencing

1. Run `scripts/monorepo-import.sh` to pull each repository into the staged directory listed above. The script uses `git subtree add` so history is preserved without grafting submodules.
2. After each import, commit the result on a dedicated branch and update `codex-import-map.json` with the new `lastImportedSha`.
3. Re-run workspace validation (`pnpm install`, `pnpm -r --if-present run lint`, `pnpm -r --if-present run build`) to confirm the subtree fits within the existing tooling.
4. For dormant or legacy repositories discovered later, place them under `/legacy/<repo>` and document the dormancy reason in that folder's `README.md`.

## Open Questions

- Confirm default branches for each repository once network access is available. Adjust the import script to use the authoritative branch names before executing live.
- Determine whether any repositories should be consolidated (for example, nested Avot agents) or remain separate workspaces.
- Identify repositories containing large assets to evaluate whether Git LFS or alternative storage is required.
