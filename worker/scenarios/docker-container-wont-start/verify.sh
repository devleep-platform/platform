#!/bin/bash
# verify.sh — docker-container-wont-start
set -euo pipefail

ERRORS=0

# broken-app should be exiting (not running)
if docker ps --filter "name=broken-app" --filter "status=running" | grep -q broken-app; then
  echo "WARN: broken-app is running (expected to be crashing)"
else
  echo "PASS: broken-app is correctly in crash loop"
fi

# The broken image should exist
if docker images broken-app:latest | grep -q broken-app; then
  echo "PASS: broken-app:latest image exists"
else
  echo "FAIL: broken-app:latest image not found"
  ERRORS=$((ERRORS + 1))
fi

# Exit code should be 127
EXIT_CODE=$(docker inspect broken-app --format '{{.State.ExitCode}}' 2>/dev/null || echo "unknown")
if [[ "$EXIT_CODE" == "127" ]]; then
  echo "PASS: exit code is 127 (command not found)"
else
  echo "INFO: exit code is $EXIT_CODE"
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
