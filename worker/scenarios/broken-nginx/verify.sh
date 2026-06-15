#!/bin/bash
# verify.sh — broken-nginx
set -euo pipefail

ERRORS=0

# nginx should be FAILING
if systemctl is-active nginx > /dev/null 2>&1; then
  echo "FAIL: nginx is running but should be broken"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: nginx is correctly broken"
fi

# nginx -t should show an error
if nginx -t 2>&1 | grep -q "emerg\|error\|invalid"; then
  echo "PASS: nginx -t reports config error"
else
  echo "FAIL: nginx -t did not report an error"
  ERRORS=$((ERRORS + 1))
fi

# The backup should exist
if [[ -f /etc/nginx/nginx.conf.backup ]]; then
  echo "PASS: config backup exists"
else
  echo "FAIL: config backup missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
