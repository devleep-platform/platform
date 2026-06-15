#!/bin/bash
# verify.sh — permission-chaos
set -euo pipefail
ERRORS=0

# webapp dir should be unreadable by www-data
WEBAPP_PERM=$(stat -c %a /var/www/webapp/ 2>/dev/null)
if [[ "$WEBAPP_PERM" == "700" ]]; then
  echo "PASS: /var/www/webapp is restricted (700)"
else
  echo "FAIL: /var/www/webapp has unexpected permissions ($WEBAPP_PERM)"
  ERRORS=$((ERRORS + 1))
fi

# database.conf should be unreadable by webapp user
if ! sudo -u webapp cat /opt/webapp/conf/database.conf > /dev/null 2>&1; then
  echo "PASS: webapp user cannot read database.conf (correctly broken)"
else
  echo "FAIL: webapp user can read database.conf (should be broken)"
  ERRORS=$((ERRORS + 1))
fi

# uploads should be world-writable (the dangerous one to fix)
UPLOADS_PERM=$(stat -c %a /var/www/webapp/uploads/ 2>/dev/null)
if [[ "$UPLOADS_PERM" == "777" ]]; then
  echo "PASS: uploads is world-writable (student should restrict this)"
else
  echo "FAIL: uploads permissions not as expected ($UPLOADS_PERM)"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
