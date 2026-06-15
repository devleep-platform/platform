#!/bin/bash
# verify.sh — docker-wrong-port
set -euo pipefail

ERRORS=0

# Port 8080 should NOT be reachable (it's on 9999)
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
  echo "FAIL: port 8080 is reachable but should be broken"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: port 8080 correctly returns connection refused"
fi

# Port 9999 should be reachable (where the container actually is)
if curl -sf http://localhost:9999 > /dev/null; then
  echo "PASS: container is running and reachable on port 9999"
else
  echo "FAIL: container not reachable on port 9999"
  ERRORS=$((ERRORS + 1))
fi

# webserver container should be running
if docker ps --filter "name=webserver" --filter "status=running" | grep -q webserver; then
  echo "PASS: webserver container is running"
else
  echo "FAIL: webserver container is not running"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
