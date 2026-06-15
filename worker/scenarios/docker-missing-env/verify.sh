#!/bin/bash
# verify.sh — docker-missing-env
set -euo pipefail

ERRORS=0

# api-app should be crashing (not running)
if docker ps --filter "name=api-app" --filter "status=running" | grep -q api-app; then
  echo "WARN: api-app is running (expected to be crashing without env vars)"
else
  echo "PASS: api-app is correctly failing without env vars"
fi

# Image should exist
if docker images api-app:latest | grep -q api-app; then
  echo "PASS: api-app:latest image exists"
else
  echo "FAIL: api-app:latest image not found"
  ERRORS=$((ERRORS + 1))
fi

# Logs should mention missing env vars
if docker logs api-app 2>&1 | grep -q "Missing required environment variables"; then
  echo "PASS: logs correctly report missing env vars"
else
  echo "FAIL: expected missing env var message in logs"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
