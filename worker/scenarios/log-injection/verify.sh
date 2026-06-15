#!/bin/bash
# verify.sh — log-injection
set -euo pipefail
ERRORS=0

BRUTE_COUNT=$(grep -c "185.234.218.42" /var/log/auth.log 2>/dev/null || echo 0)
if [[ $BRUTE_COUNT -ge 20 ]]; then
  echo "PASS: brute force entries from 185.234.218.42 ($BRUTE_COUNT lines)"
else
  echo "FAIL: expected >=20 brute force entries, got $BRUTE_COUNT"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "Accepted password.*192.168.44.78" /var/log/auth.log 2>/dev/null; then
  echo "PASS: successful compromise entry exists"
else
  echo "FAIL: compromise entry missing"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "SELECT \* FROM users" /var/log/app.log 2>/dev/null; then
  echo "PASS: post-compromise app log entry exists"
else
  echo "FAIL: post-compromise app log entry missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
