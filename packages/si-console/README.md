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
```
