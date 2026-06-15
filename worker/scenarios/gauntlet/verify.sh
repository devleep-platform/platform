#!/bin/bash
# verify.sh — gauntlet
set -euo pipefail
ERRORS=0

# Disk must be high
DISK_PCT=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
if [ "${DISK_PCT:-0}" -ge 85 ]; then
  echo "PASS: disk at ${DISK_PCT}%"
else
  echo "FAIL: disk at ${DISK_PCT}% — expected >=85%"
  ERRORS=$((ERRORS + 1))
fi

# api.service must NOT be running (fails due to missing config)
if ! systemctl is-active api.service > /dev/null 2>&1; then
  echo "PASS: api.service correctly stopped (missing config)"
else
  echo "FAIL: api.service is running — should be stopped by missing config"
  ERRORS=$((ERRORS + 1))
fi

# nginx must be running
if systemctl is-active nginx > /dev/null 2>&1; then
  echo "PASS: nginx is running"
else
  echo "FAIL: nginx is not running"
  ERRORS=$((ERRORS + 1))
fi

# HTTP must return 502 (nginx up, API down)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health --max-time 3 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "502" ]; then
  echo "PASS: HTTP /health returns 502 (nginx proxying to dead API)"
else
  echo "WARN: HTTP returned $HTTP_CODE (expected 502, nginx may still be starting)"
fi

# Backup files must be accessible for recovery
if [ -f /opt/api/bin/api.bak ] && [ -f /opt/api/config-backup/config.yaml ]; then
  echo "PASS: backup binary and config available for recovery"
else
  echo "FAIL: backup recovery files missing"
  ERRORS=$((ERRORS + 1))
fi

[ $ERRORS -eq 0 ] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
