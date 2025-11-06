# `@sovereign-codex/si-console`

Administrative console services and orchestration tooling for Sovereign Codex. This package will evolve into the primary interface for operating the platform.

## Building

```bash
pnpm --filter @sovereign-codex/si-console build
```

## CLI

The workspace-level `pnpm si` command proxies into this package. Use it to scaffold new agents or run the dashboard UI:

```bash
pnpm si new my-agent
pnpm si ui
pnpm si run create-monorepo-phase-2 --enable-auto-sync --include-dashboard --token SOVEREIGN_IMPORT_TOKEN --open-pr
```

Running the automation task above records the requested options in `manifests/monorepo-phase-2.config.json` so follow-up tooling
can determine how to execute Phase 2 of the monorepo import.
