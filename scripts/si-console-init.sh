#!/usr/bin/env bash
set -euo pipefail

if npx si console init "$@"; then
  exit 0
fi

status=$?
cat <<'MSG'
The command "npx si console init" failed. The npm registry responded with a 403
Forbidden error, which usually indicates that the package is private or access is
restricted in this environment.

Please ensure that you have the correct credentials or VPN access configured for
the "si" package before retrying.
MSG

exit "$status"
