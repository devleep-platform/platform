#!/bin/bash
# verify.sh — route-broken
set -euo pipefail
ERRORS=0

# Blackhole route must be present
if ip route show 2>/dev/null | grep -qE 'blackhole.*192\.168\.100|192\.168\.100.*blackhole'; then
  echo "PASS: blackhole route for 192.168.100.0/24 exists"
else
  echo "FAIL: blackhole route missing"
  ERRORS=$((ERRORS + 1))
fi

# app.log must exist with errors
if test -f /var/log/app.log; then
  echo "PASS: /var/log/app.log exists"
  COUNT=$(grep -c "no route to host\|192.168.100" /var/log/app.log 2>/dev/null || echo 0)
  if [[ $COUNT -ge 10 ]]; then
    echo "PASS: app.log has $COUNT error entries"
  else
    echo "FAIL: app.log only has $COUNT matching entries — expected >=10"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "FAIL: /var/log/app.log missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
