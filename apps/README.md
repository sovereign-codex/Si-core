# Applications

This directory hosts deployable Sovereign Intelligence applications. During Phase 2 of the monorepo migration each active application repository from the `sovereign-codex` organisation will be imported into `/apps/<repo>` using `scripts/monorepo-import.sh`.

## Conventions

- Use `pnpm init --workspace` when bootstrapping an imported application so shared configuration is inherited automatically.
- Extend `../../tsconfig.base.json` for compiler settings and workspace path aliases.
- Expose `dev`, `build`, and `start` scripts so CI and developer tooling can interact with the app consistently.
- Document any repository-specific deployment notes in a local `README.md` after import.
