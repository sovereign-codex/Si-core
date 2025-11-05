# `@sovereign-intelligence/avot`

AVOT (Autonomous Vector Operations Toolkit) packages and tooling. This workspace module provides helpers for creating service-specific AVOT repositories using the provided bootstrap script.

## Building

```bash
pnpm --filter @sovereign-intelligence/avot build
```

## Creating a New AVOT Package

Use the repository-level bootstrap command:

```bash
pnpm bootstrap:avot my-new-repo
```

This generates `packages/avot/my-new-repo` with starter TypeScript sources and metadata.
