# Packages

Reusable libraries, shared utilities, and domain modules live here. Every subdirectory is a pnpm workspace package that can be consumed by applications and other packages within the monorepo.

## Authoring guidelines

- Namespace packages under `@sovereign-intelligence/*`.
- Extend `../../tsconfig.base.json` to inherit strict compiler options and shared path aliases.
- Surface `build`, `lint`, `test`, and `typecheck` scripts where applicable so CI can execute them via `pnpm -r`.
