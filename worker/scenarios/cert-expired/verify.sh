#!/bin/bash
# verify.sh — cert-expired
set -euo pipefail
ERRORS=0

# Certificate must exist
if test -f /etc/nginx/ssl/server.crt; then
  echo "PASS: server.crt exists"
else
  echo "FAIL: server.crt missing"
  ERRORS=$((ERRORS + 1))
fi

# Certificate must expire within 24 hours (that is the scenario)
if ! openssl x509 -in /etc/nginx/ssl/server.crt -noout -checkend 86400 2>/dev/null; then
  echo "PASS: certificate expires within 24 hours (correctly broken)"
else
  echo "FAIL: certificate is valid for more than 24 hours — scenario not set up correctly"
  ERRORS=$((ERRORS + 1))
fi

# nginx must be running
if systemctl is-active nginx > /dev/null 2>&1; then
  echo "PASS: nginx is active"
else
  echo "FAIL: nginx is not active"
  ERRORS=$((ERRORS + 1))
fi

# Alert log must exist
if test -f /var/log/cert-monitor.log; then
  echo "PASS: cert-monitor.log exists"
else
  echo "FAIL: cert-monitor.log missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
