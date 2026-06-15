#!/bin/bash
# verify.sh — oom-killer
set -euo pipefail
ERRORS=0

# myapp service must be running (student needs pgrep myapp to work)
if systemctl is-active myapp.service > /dev/null 2>&1; then
  echo "PASS: myapp.service is active"
else
  echo "FAIL: myapp.service not running"
  ERRORS=$((ERRORS + 1))
fi

# pgrep must resolve to a real PID
APP_PID=$(pgrep myapp 2>/dev/null | head -1 || true)
if [ -n "$APP_PID" ]; then
  echo "PASS: myapp process found (PID $APP_PID)"
else
  echo "FAIL: pgrep myapp returned no result"
  ERRORS=$((ERRORS + 1))
fi

# OOM events must be in kern.log
if grep -q "Out of memory.*myapp" /var/log/kern.log 2>/dev/null; then
  COUNT=$(grep -c "Out of memory.*myapp" /var/log/kern.log 2>/dev/null || echo 0)
  echo "PASS: $COUNT OOM kill events in kern.log"
else
  echo "FAIL: OOM events missing from kern.log"
  ERRORS=$((ERRORS + 1))
fi

# No swap (student must add it as part of the lab)
if swapon -s 2>/dev/null | grep -qv "Filename"; then
  echo "WARN: swap is already active — student may have pre-configured it"
else
  echo "PASS: no swap active (student task to add it)"
fi

[ $ERRORS -eq 0 ] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
