# Sovereign Intelligence Monorepo

Welcome to the Sovereign Intelligence core workspace. This repository is organised as a pnpm-powered monorepo that houses every first-party application, reusable package, automation script, and documentation source for the platform.

## Repository layout

```
/apps      Application frontends, backends, and services.
/packages  Shareable libraries and domain packages published internally.
/scripts   Developer tooling, automation utilities, and maintenance tasks.
/docs      Product and engineering documentation sources.
```

Each workspace is managed as an independent package and can expose scripts that participate in the shared automation described below.

## Prerequisites

- [Node.js 20+](https://nodejs.org/) with [corepack](https://nodejs.org/api/corepack.html) enabled.
- [pnpm](https://pnpm.io/) (automatically provisioned when corepack is enabled).

## Getting started

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install -r
```

The install step resolves dependencies for every workspace and links cross-package references via `workspace:*` ranges.

## Common scripts

To run a script across every workspace package use the recursive pnpm runner:

```bash
pnpm -r --if-present run build
pnpm -r --if-present run lint
pnpm -r --if-present run test
```

Individual workspaces can also be targeted using pnpm filters, for example:

```bash
pnpm --filter @sovereign-intelligence/si-core run dev
```

## TypeScript configuration

Shared compiler options live in [`tsconfig.base.json`](./tsconfig.base.json). Workspaces should extend this base file to inherit strict compiler settings and path aliases for internal imports.

## Continuous integration

GitHub Actions validates every pull request and push to `main` by installing dependencies once and running lint, type-check, and build tasks across all workspaces. Additional quality gates can be added per-package by exposing scripts with matching names.

## License

Copyright © Sovereign Intelligence. All rights reserved.
