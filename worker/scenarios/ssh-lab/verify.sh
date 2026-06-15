#!/bin/bash
# verify.sh — ssh-lab
set -euo pipefail
ERRORS=0

if docker ps 2>/dev/null | grep -q ssh-target; then
  echo "PASS: ssh-target container is running"
else
  echo "FAIL: ssh-target container not running"
  ERRORS=$((ERRORS + 1))
fi

# Check container is listening on port 2222
if ss -tlnp 2>/dev/null | grep -q ':2222'; then
  echo "PASS: port 2222 is listening"
else
  echo "FAIL: port 2222 not listening"
  ERRORS=$((ERRORS + 1))
fi

# Check labuser exists on host
if id labuser > /dev/null 2>&1; then
  echo "PASS: labuser account exists on host"
else
  echo "FAIL: labuser account missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
