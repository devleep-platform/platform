#!/bin/bash
# verify.sh — hello-linux
set -euo pipefail

ERRORS=0

check() {
  local desc="$1"; shift
  if "$@" > /dev/null 2>&1; then
    echo "PASS: $desc"
  else
    echo "FAIL: $desc"
    ERRORS=$((ERRORS + 1))
  fi
}

check "nginx is active"         systemctl is-active nginx
check "nginx responds HTTP 200" curl -sf http://localhost/health
check "app.log exists"          test -f /var/log/app.log
check "app.log has content"     test -s /var/log/app.log
check "auth.log exists"         test -f /var/log/auth.log
check "/opt/myapp exists"       test -d /opt/myapp/conf
check "app.conf exists"         test -f /opt/myapp/conf/app.conf
check "curl installed"          which curl
check "jq installed"            which jq

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
