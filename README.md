# Sovereign Intelligence Monorepo

This repository hosts the multi-package workspace for Sovereign Intelligence. It is managed with [pnpm](https://pnpm.io/) and is organized into a collection of packages that target different runtime surfaces across the platform.

## Workspace Layout

| Package | Description |
| ------- | ----------- |
| `@sovereign-intelligence/si-core` | Core services, ingestion, and foundational business logic. |
| `@sovereign-intelligence/si-console` | Administrative console and orchestration tooling. |
| `@sovereign-intelligence/avot` | AVOT service implementations and extensions. |
| `@sovereign-intelligence/lattice` | Graph and lattice-processing components. |
| `@sovereign-intelligence/manifests` | Distribution manifests and schema definitions. |
| `@sovereign-intelligence/shared` | Shared type definitions and utility helpers used across packages. |
| `@sovereign-intelligence/docs` | Source for public and internal documentation. |

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

4. Bootstrap a new AVOT package stub:

   ```bash
   pnpm bootstrap:avot my-new-service
   ```

This creates a new package inside `packages/avot/` using the shared template.

## Conventions

- TypeScript configuration is shared through `tsconfig.base.json` at the repository root.
- Workspace packages reference each other through `workspace:*` ranges so local changes are immediately available without publishing.
- Utilities and type definitions that are shared between packages should live in `packages/shared`.

## License

This repository is maintained by the Sovereign Intelligence team. Additional licensing details will be provided in future updates.
