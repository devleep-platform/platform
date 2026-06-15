#!/bin/bash
# verify.sh — disk-full
set -euo pipefail
ERRORS=0

DISK_PCT=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
if [[ $DISK_PCT -ge 88 ]]; then
  echo "PASS: disk at ${DISK_PCT}% (target >=88%)"
else
  echo "FAIL: disk only at ${DISK_PCT}% — not full enough"
  ERRORS=$((ERRORS + 1))
fi

if [[ -f /var/log/webapp/access.log ]]; then
  echo "PASS: large log file exists ($(du -sh /var/log/webapp/access.log | awk '{print $1}'))"
else
  echo "FAIL: large log file missing"
  ERRORS=$((ERRORS + 1))
fi

if [[ -f /var/run/webapp-logger.pid ]] && kill -0 $(cat /var/run/webapp-logger.pid) 2>/dev/null; then
  echo "PASS: logger process is running"
else
  echo "WARN: logger process not running (non-critical)"
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
