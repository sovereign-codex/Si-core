# `@sovereign-codex/si-core`

The core runtime services and ingestion pipelines that power Sovereign Codex. This package will eventually expose service orchestrators, ingestion flows, and foundational domain models.

## Development Goals

- Provide ingestion frameworks (formerly tracked under the standalone `ingest` folder).
- Surface shared domain logic consumed by higher-level applications.
- Offer structured exports for service embedding inside downstream packages.

## Building

```bash
pnpm --filter @sovereign-codex/si-core build
```
