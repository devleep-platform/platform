#!/bin/bash
# verify.sh — log-flood
set -euo pipefail
ERRORS=0

if test -d /var/log/webapp; then
  echo "PASS: /var/log/webapp directory exists"
else
  echo "FAIL: /var/log/webapp missing"
  ERRORS=$((ERRORS + 1))
fi

if test -f /var/log/webapp/access.log; then
  echo "PASS: access.log exists"
else
  echo "FAIL: access.log missing"
  ERRORS=$((ERRORS + 1))
fi

if systemctl is-active webapp-logger.service > /dev/null 2>&1; then
  echo "PASS: webapp-logger service is running"
else
  echo "FAIL: webapp-logger not running"
  ERRORS=$((ERRORS + 1))
fi

# logrotate config must NOT exist (that is the bug)
if ! test -f /etc/logrotate.d/webapp; then
  echo "PASS: no logrotate config for webapp (correctly broken)"
else
  echo "FAIL: /etc/logrotate.d/webapp exists — scenario not in broken state"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
