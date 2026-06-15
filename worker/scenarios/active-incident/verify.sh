#!/bin/bash
# verify.sh — active-incident
set -euo pipefail
ERRORS=0

# Disk should be high
DISK_PCT=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
if [[ $DISK_PCT -ge 85 ]]; then
  echo "PASS: disk at ${DISK_PCT}%"
else
  echo "FAIL: disk at ${DISK_PCT}% — expected >=85%"
  ERRORS=$((ERRORS + 1))
fi

# nginx should be broken
if ! systemctl is-active nginx > /dev/null 2>&1; then
  echo "PASS: nginx is correctly broken"
else
  echo "FAIL: nginx is running — should be broken"
  ERRORS=$((ERRORS + 1))
fi

# nginx -t should fail
if ! nginx -t > /dev/null 2>&1; then
  echo "PASS: nginx config has errors"
else
  echo "FAIL: nginx config is valid — should have errors"
  ERRORS=$((ERRORS + 1))
fi

# CPU hog should be running
sleep 3
if systemctl is-active incident-cpu > /dev/null 2>&1; then
  echo "PASS: incident-cpu service is running"
else
  echo "FAIL: incident-cpu service not running"
  ERRORS=$((ERRORS + 1))
fi

# Cron should be broken
if crontab -l 2>/dev/null | grep -q "db-cleanup"; then
  echo "PASS: db-cleanup cron entry exists"
else
  echo "FAIL: db-cleanup cron entry missing"
  ERRORS=$((ERRORS + 1))
fi

if ! /usr/local/bin/db-cleanup.sh > /dev/null 2>&1; then
  echo "PASS: db-cleanup script fails when run directly"
else
  echo "FAIL: db-cleanup script ran successfully — should be broken"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
