#!/usr/bin/env bash
set -euo pipefail

# Imports Sovereign Codex repositories into the monorepo using git subtree.
# Keep the repository list in sync with codex-import-map.json and MIGRATION_PLAN.md.

ORG=${GITHUB_ORG:-sovereign-codex}
DRY_RUN=${DRY_RUN:-false}

repos=(
  avot
  avot-convergence
  docs
  lattice
  manifests
  shared-utils
  si-console
  si-core
)

declare -A repo_paths=(
  [avot]="packages/avot"
  [avot-convergence]="packages/avot-convergence"
  [docs]="docs/docs"
  [lattice]="packages/lattice"
  [manifests]="packages/manifests"
  [shared-utils]="packages/shared-utils"
  [si-console]="packages/si-console"
  [si-core]="packages/si-core"
)

declare -A default_branches=(
  [avot]="main"
  [avot-convergence]="main"
  [docs]="main"
  [lattice]="main"
  [manifests]="main"
  [shared-utils]="main"
  [si-console]="main"
  [si-core]="main"
)

for repo in "${repos[@]}"; do
  target_dir=${repo_paths[$repo]}
  branch=${default_branches[$repo]}
  remote="git@github.com:${ORG}/${repo}.git"

  echo "---"
  echo "Importing ${remote} (${branch}) into ${target_dir}"

  if [[ ${DRY_RUN} == "true" ]]; then
    echo "git subtree add --prefix='${target_dir}' '${remote}' '${branch}' --squash"
    continue
  fi

  if [[ -d "${target_dir}" && -n "$(ls -A "${target_dir}" 2>/dev/null)" ]]; then
    echo "Skipping ${repo}: ${target_dir} already contains files. Remove them before importing." >&2
    continue
  fi

  git subtree add --prefix="${target_dir}" "${remote}" "${branch}" --squash

done

