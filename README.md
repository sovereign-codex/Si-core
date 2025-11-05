# Sovereign Codex Monorepo

This repository hosts the multi-package workspace for Sovereign Codex. It is managed with [pnpm](https://pnpm.io/) and is organized into a collection of packages that target different runtime surfaces across the platform.

## Workspace Layout

| Package | Description |
| ------- | ----------- |
| `@sovereign-codex/si-core` | Core services, ingestion, and foundational business logic. |
| `@sovereign-codex/si-console` | Administrative console and orchestration tooling. |
| `@sovereign-codex/avot` | AVOT service implementations and extensions. |
| `@sovereign-codex/lattice` | Graph and lattice-processing components. |
| `@sovereign-codex/manifests` | Distribution manifests and schema definitions. |
| `@sovereign-codex/shared-utils` | Shared type definitions and utility helpers used across packages. |
| `@sovereign-codex/docs` | Source for public and internal documentation. |

## Getting Started

1. Install pnpm if necessary:

   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

2. Install dependencies for every workspace package:

   ```bash
   pnpm install
   ```

3. Run scripts across the workspace as needed:

   ```bash
   pnpm -r run build
   pnpm -r run lint
   ```

4. Bootstrap a new AVOT agent package stub:

   ```bash
   pnpm si new my-new-service
   ```

This creates a new agent package inside `packages/avot/` using the shared template.

## Conventions

- TypeScript configuration is shared through `tsconfig.base.json` at the repository root.
- Workspace packages reference each other through `workspace:*` ranges so local changes are immediately available without publishing.
- Utilities and type definitions that are shared between packages should live in `packages/shared-utils`.

## License

This repository is maintained by the Sovereign Codex team. Additional licensing details will be provided in future updates.
