# Codex Environment Synchronisation

The `scripts/sync-codex-environments.mjs` script keeps the Codex environment selector
aligned with the repositories that live inside the `sovereign-codex` GitHub organization.

## Prerequisites

1. A GitHub personal access token with the `repo` scope and visibility to the
   `sovereign-codex` organization.
2. (Optional) Credentials for the Codex API endpoint that accepts environment sync
   payloads. Export `CODEX_API_URL` and `CODEX_API_TOKEN` to enable this integration.

## Usage

```bash
export GITHUB_TOKEN=ghp_xxx                     # required for private repos
export CODEX_API_URL="https://codex.internal/api"   # optional
export CODEX_API_TOKEN="codex-secret"               # optional

pnpm codex:sync-environments
```

The command will:

1. Pull every repository (public, private, archived) from GitHub.
2. Categorise the repository into `core`, `modules`, or `archives` based on naming rules or
   overrides defined in `manifests/codex-environment-overrides.json`.
3. Derive the status (`active`, `dormant`, `archived`) from GitHub metadata, again allowing
   manual overrides.
4. Decide whether Codex should enable the repository by default. Active repositories are
   enabled unless overridden.
5. Write `CODEX_ENVIRONMENTS.md` and `manifests/codex-environments.json` with the full
   dataset.
6. POST the dataset to the Codex API if the credentials are provided.

## Overrides

When the automatic heuristics do not match a repository, add an entry to
`manifests/codex-environment-overrides.json`:

```json
{
  "si-core": {
    "category": "core",
    "status": "active",
    "defaultEnabled": true
  }
}
```

Only the fields that need adjustment must be supplied.

## Scheduling

Add the command to the existing Codex automation pipeline (for example the same place that
runs `codex:watch`). The script is idempotent and can be re-run at any time to detect new
repositories or updates to existing ones.
