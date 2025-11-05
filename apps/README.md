# Applications

This directory contains deployable Sovereign Intelligence applications. Each subfolder should be a standalone workspace package with its own `package.json` that extends the shared configuration from the repository root.

## Conventions

- Use `pnpm init` with the `--workspace` flag to scaffold new applications.
- Extend `../../tsconfig.base.json` for shared TypeScript settings.
- Expose `dev`, `build`, and `start` scripts so CI and developer tooling can interact with the app consistently.
