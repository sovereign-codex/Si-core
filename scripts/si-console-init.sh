#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_WRAPPER="$SCRIPT_DIR/si-console-local.js"

run_remote_console() {
  local package_ref="$1"
  shift

  if ! command -v npx >/dev/null 2>&1; then
    echo "npx is not available on the PATH. Skipping remote console execution." >&2
    return 1
  fi

  echo "Attempting to initialize console using package: ${package_ref}" >&2
  if npx "${package_ref}" init "$@"; then
    return 0
  fi

  echo "Console initialization via ${package_ref} failed." >&2
  return 1
}

if run_remote_console "@sovereign-codex/si-console" "$@"; then
  exit 0
fi

echo "Falling back to GitHub package reference..." >&2
if run_remote_console "github:sovereign-codex/si-console" "$@"; then
  exit 0
fi

echo "Falling back to local console wrapper..." >&2
if [ -x "$LOCAL_WRAPPER" ]; then
  if command -v node >/dev/null 2>&1; then
    node "$LOCAL_WRAPPER" "$@"
    exit $?
  fi

  echo "Node.js is not available on the PATH. Unable to execute local console wrapper." >&2
  exit 1
fi

echo "Local console wrapper not found or not executable at $LOCAL_WRAPPER." >&2
echo "Please ensure scripts/si-console-local.js exists and is executable." >&2
exit 1
