#!/bin/bash
# verify.sh — multi-server
set -euo pipefail
ERRORS=0

for i in 1 2 3; do
  if docker ps 2>/dev/null | grep -q "fleet-node-$i"; then
    echo "PASS: fleet-node-$i is running"
  else
    echo "FAIL: fleet-node-$i not running"
    ERRORS=$((ERRORS + 1))
  fi
done

# fleet.txt must have exactly 3 lines
if test -f /home/ubuntu/fleet.txt; then
  COUNT=$(wc -l < /home/ubuntu/fleet.txt)
  if [[ $COUNT -eq 3 ]]; then
    echo "PASS: fleet.txt has 3 hosts"
  else
    echo "FAIL: fleet.txt has $COUNT lines — expected 3"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "FAIL: /home/ubuntu/fleet.txt missing"
  ERRORS=$((ERRORS + 1))
fi

# fleet key must exist
if test -f /home/ubuntu/.ssh/fleet_key; then
  echo "PASS: fleet_key exists"
else
  echo "FAIL: fleet_key missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
