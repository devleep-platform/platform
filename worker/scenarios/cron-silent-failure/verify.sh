#!/bin/bash
# verify.sh — cron-silent-failure
set -euo pipefail
ERRORS=0

if [[ -f /usr/local/bin/db-backup.sh ]]; then
  echo "PASS: backup script exists"
else
  echo "FAIL: backup script missing"
  ERRORS=$((ERRORS + 1))
fi

if crontab -l 2>/dev/null | grep -q "db-backup"; then
  echo "PASS: cron entry for db-backup exists"
else
  echo "FAIL: cron entry missing"
  ERRORS=$((ERRORS + 1))
fi

# Backup dir should NOT exist (that's the bug)
if [[ ! -d /opt/backups/db ]]; then
  echo "PASS: /opt/backups/db missing (correctly broken)"
else
  echo "FAIL: /opt/backups/db exists — scenario not broken correctly"
  ERRORS=$((ERRORS + 1))
fi

# Running the script should fail
if ! /usr/local/bin/db-backup.sh > /dev/null 2>&1; then
  echo "PASS: backup script fails when run (correctly broken)"
else
  echo "FAIL: backup script succeeded — should be failing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
