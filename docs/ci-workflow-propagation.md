# CI Workflow Propagation

The `scripts/propagate-ci-workflow.mjs` script uploads the shared CI workflow template to
repositories in the `sovereign-codex` GitHub organization. It automates branch creation,
workflow updates, and pull request creation so every repository stays aligned with the
latest template checked into this workspace.

## Prerequisites

1. A GitHub personal access token with permissions to read and write to the repositories
   you want to update. Export it as `GITHUB_TOKEN`.
2. (Optional) Set `GITHUB_ORG` if you need to target a different organization. It defaults
   to `sovereign-codex`.
3. Node.js 18 or newer. The script relies on the native Fetch API when available.

## Usage

```bash
export GITHUB_TOKEN=ghp_xxx

# Dry run against every repository
node scripts/propagate-ci-workflow.mjs --dry-run

# Update a single repository and create a pull request
node scripts/propagate-ci-workflow.mjs --repo si-core
```

The script performs the following steps for each repository:

1. Compare `.github/workflows/ci.yml` on the default branch with the local template.
2. Create or update the branch `automation/update-ci-workflow` based on the default
   branch.
3. Commit the template if it differs (or when `--force` is provided).
4. Open a pull request titled **"Sync CI workflow template"** targeting the default branch.

Pass `--template` to point at a different workflow file, `--branch` to use a custom branch
name, or `--commit-message`, `--pr-title`, and `--pr-body` to customise the generated
artifacts. Repeat `--repo <name>` to limit the run to specific repositories.

## npm Script

You can also run the command via pnpm:

```bash
pnpm codex:propagate-ci -- --dry-run
```

The extra `--` is required so pnpm forwards subsequent flags to the Node.js script.
