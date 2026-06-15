#!/bin/bash
# verify.sh — docker-base
set -euo pipefail

ERRORS=0

if docker ps --filter "name=webserver" --filter "status=running" | grep -q webserver; then
  echo "PASS: webserver container is running"
else
  echo "FAIL: webserver container is not running"
  ERRORS=$((ERRORS + 1))
fi

if curl -sf http://localhost:8080 > /dev/null; then
  echo "PASS: port 8080 is reachable"
else
  echo "FAIL: port 8080 not reachable"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
