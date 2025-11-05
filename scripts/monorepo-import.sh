#!/usr/bin/env bash
set -euo pipefail

# Imports every repository from the sovereign-codex organisation into this
# monorepo using git subtree so full history is retained. Repository metadata
# is fetched live from the GitHub API to keep the import list up to date.

ORG=${GITHUB_ORG:-sovereign-codex}
ROOT_DIR=$(git rev-parse --show-toplevel)
IMPORT_MAP_FILE="${ROOT_DIR}/codex-import-map.json"
INDEX_FILE="${ROOT_DIR}/docs/INDEX.md"
MIGRATION_PLAN_FILE="${ROOT_DIR}/MIGRATION_PLAN.md"
DRY_RUN=${DRY_RUN:-false}
API_URL="https://api.github.com"
API_VERSION_HEADER="X-GitHub-Api-Version: 2022-11-28"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' not found in PATH." >&2
    exit 1
  fi
}

require_command curl
require_command jq

if [[ -z "${GH_PAT:-}" ]]; then
  echo "GH_PAT environment variable must be provided with access to ${ORG}." >&2
  exit 1
fi

cleanup_askpass() {
  if [[ -n "${GIT_ASKPASS:-}" && -f "${GIT_ASKPASS}" ]]; then
    rm -f "${GIT_ASKPASS}"
  fi
}

trap cleanup_askpass EXIT

tmp_askpass=$(mktemp)
cat <<EOS >"${tmp_askpass}"
#!/usr/bin/env bash
case "$1" in
  *Username*) echo "x-access-token" ;;
  *Password*) echo "${GH_PAT}" ;;
  *) echo "" ;;
esac
EOS
chmod +x "${tmp_askpass}"
export GIT_ASKPASS="${tmp_askpass}"
export GIT_TERMINAL_PROMPT=0

fetch_all_repos() {
  local page=1
  local repos_json='[]'
  while :; do
    local response
    response=$(curl -sfSL \
      -H "Authorization: Bearer ${GH_PAT}" \
      -H "Accept: application/vnd.github+json" \
      -H "${API_VERSION_HEADER}" \
      "${API_URL}/orgs/${ORG}/repos?per_page=100&page=${page}&type=all")
    local page_length
    page_length=$(jq 'length' <<<"${response}")
    if [[ ${page_length} -eq 0 ]]; then
      break
    fi
    repos_json=$(jq -s '.[0] + .[1]' <(printf '%s' "${repos_json}") <(printf '%s' "${response}"))
    if [[ ${page_length} -lt 100 ]]; then
      break
    fi
    ((page+=1))
  done
  echo "${repos_json}"
}

determine_target_prefix() {
  local name="$1"
  local archived="$2"
  local topics="$3"
  local lower_name
  lower_name=$(tr '[:upper:]' '[:lower:]' <<<"${name}")

  if [[ "${archived}" == "true" ]]; then
    echo "archive/${name}"
    return
  fi

  if [[ " ${topics} " == *" infrastructure "* || " ${topics} " == *" infra "* || "${lower_name}" == infra* || "${lower_name}" == *"-infra" || "${lower_name}" == *"-terraform" ]]; then
    echo "infra/${name}"
    return
  fi

  if [[ " ${topics} " == *" documentation "* || " ${topics} " == *" docs "* || "${lower_name}" == doc* || "${lower_name}" == *"-docs" || "${lower_name}" == *"-handbook" ]]; then
    echo "docs/${name}"
    return
  fi

  if [[ " ${topics} " == *" app "* || " ${topics} " == *" application "* || "${lower_name}" == app* || "${lower_name}" == *"-app" || "${lower_name}" == *"-frontend" ]]; then
    echo "apps/${name}"
    return
  fi

  if [[ " ${topics} " == *" script "* || " ${topics} " == *" tooling "* || " ${topics} " == *" cli "* || "${lower_name}" == script* || "${lower_name}" == *"-scripts" || "${lower_name}" == *"-cli" ]]; then
    echo "scripts/${name}"
    return
  fi

  echo "packages/${name}"
}

repos_json=$(fetch_all_repos)
repo_count=$(jq 'length' <<<"${repos_json}")

if [[ ${repo_count} -eq 0 ]]; then
  echo "No repositories found for organisation ${ORG}." >&2
  exit 1
fi

echo "Discovered ${repo_count} repositories under ${ORG}."

map_json='[]'
docs_entries=()
table_rows=()

while IFS= read -r repo; do
  name=$(jq -r '.name' <<<"${repo}")
  default_branch=$(jq -r '.default_branch // "main"' <<<"${repo}")
  archived=$(jq -r '.archived' <<<"${repo}")
  topics=$(jq -r '.topics // [] | join(" ")' <<<"${repo}")
  description=$(jq -r '.description // ""' <<<"${repo}")
  target_prefix=$(determine_target_prefix "${name}" "${archived}" "${topics}")
  category=${target_prefix%%/*}
  status=$([[ "${archived}" == "true" ]] && echo "archived" || echo "active")
  remote="https://github.com/${ORG}/${name}.git"

  echo "---"
  echo "Importing ${remote} (${default_branch}) into ${target_prefix}"

  docs_entries+=("- [${name}](../${target_prefix}/README.md)")

  note="Auto-categorised into '${category}'."
  if [[ -n "${topics}" ]]; then
    note+=" Topics: ${topics}."
  fi
  if [[ -n "${description}" ]]; then
    note+=" ${description}"
  fi

  table_rows+=("| ${name} | ${target_prefix} | ${status} | ${default_branch} | ${note//|/\|} |")

  map_json=$(jq \
    --arg name "${name}" \
    --arg path "${target_prefix}" \
    --arg status "${status}" \
    --arg branch "${default_branch}" \
    --arg category "${category}" \
    '. + [{name:$name, monorepoPath:$path, status:$status, defaultBranch:$branch, category:$category, lastImportedSha:null}]' \
    <<<"${map_json}")

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "DRY RUN: git subtree add --prefix='${target_prefix}' '${remote}' '${default_branch}'"
    continue
  fi

  if git rev-list -1 HEAD -- "${target_prefix}" >/dev/null 2>&1; then
    echo "Updating existing subtree for ${name}."
    git subtree pull --prefix="${target_prefix}" "${remote}" "${default_branch}" || {
      echo "Failed to pull subtree for ${name}." >&2
      exit 1
    }
  else
    echo "Adding subtree for ${name}."
    git subtree add --prefix="${target_prefix}" "${remote}" "${default_branch}" || {
      echo "Failed to add subtree for ${name}." >&2
      exit 1
    }
  fi

done < <(jq -c '.[]' <<<"${repos_json}")

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "Dry run complete. Skipping documentation updates."
  exit 0
fi

jq --arg org "${ORG}" --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson repos "${map_json}" \
  '{generatedAt:$now, organization:$org, repositories:$repos}' \
  >"${IMPORT_MAP_FILE}"

{
  cat <<'EOS'
# Sovereign Codex Repository Index

This index is automatically generated by `scripts/monorepo-import.sh` to honour the README merge policy.

<!-- BEGIN MONOREPO-INDEX -->
EOS
  if ((${#docs_entries[@]} > 0)); then
    printf '%s\\n' "${docs_entries[@]}" | sort
  else
    echo "_No repositories discovered._"
  fi
  cat <<'EOS'
<!-- END MONOREPO-INDEX -->
EOS
} >"${INDEX_FILE}"

auto_table=""
if ((${#table_rows[@]} > 0)); then
  auto_table=$(printf '%s\\n' "${table_rows[@]}" | sort)
fi

awk -v table="${auto_table}" '
  BEGIN { in_block=0 }
  /^<!-- BEGIN MONOREPO-IMPORT TABLE -->/ {
    print
    if (length(table) > 0) {
      print table
    } else {
      print "| _No repositories discovered._ |  |  |  |  |"
    }
    in_block=1
    next
  }
  /^<!-- END MONOREPO-IMPORT TABLE -->/ {
    in_block=0
  }
  in_block==1 { next }
  { print }
' "${MIGRATION_PLAN_FILE}" >"${MIGRATION_PLAN_FILE}.tmp"

mv "${MIGRATION_PLAN_FILE}.tmp" "${MIGRATION_PLAN_FILE}"

echo "Monorepo import complete."
