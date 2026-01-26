# Packages

Reusable libraries, shared utilities, and domain modules live here. Phase 2 of the monorepo migration will import active shared-library repositories from `sovereign-codex` into `/packages/<repo>` so they can publish from a unified workspace.

## Authoring guidelines

- Namespace packages under `@sovereign-codex/*` to match existing published artifacts.
- Extend `../../tsconfig.base.json` to inherit strict compiler options and shared path aliases.
- Surface `build`, `lint`, `test`, and `typecheck` scripts where applicable so CI can execute them via `pnpm -r`.
- Record migration notes for each repository in a local `README.md` once the subtree import completes.
