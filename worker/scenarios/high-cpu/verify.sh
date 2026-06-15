#!/bin/bash
# verify.sh — high-cpu
set -euo pipefail
ERRORS=0

sleep 3  # let service stabilise

if systemctl is-active dataprocessor > /dev/null 2>&1; then
  echo "PASS: dataprocessor service is running"
else
  echo "FAIL: dataprocessor service is not active"
  ERRORS=$((ERRORS + 1))
fi

CPU=$(ps aux --sort=-%cpu | awk 'NR==2{print $3}')
CPU_INT=${CPU%.*}
if [[ ${CPU_INT:-0} -ge 50 ]]; then
  echo "PASS: high CPU load confirmed (${CPU}%)"
else
  echo "WARN: CPU only at ${CPU}% — may need a moment to ramp up"
fi

if crontab -l 2>/dev/null | grep -q backup-processor; then
  echo "PASS: cron entry for backup-processor exists"
else
  echo "FAIL: cron entry missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
