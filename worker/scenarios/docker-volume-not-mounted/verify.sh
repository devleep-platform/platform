#!/bin/bash
# verify.sh — docker-volume-not-mounted
set -euo pipefail

ERRORS=0

# webserver should be running
if docker ps --filter "name=webserver" --filter "status=running" | grep -q webserver; then
  echo "PASS: webserver container is running"
else
  echo "FAIL: webserver container is not running"
  ERRORS=$((ERRORS + 1))
fi

# Port 8080 should be reachable
if curl -sf http://localhost:8080 > /dev/null; then
  echo "PASS: port 8080 is reachable"
else
  echo "FAIL: port 8080 not reachable"
  ERRORS=$((ERRORS + 1))
fi

# Content should be the default nginx page (not the real site yet)
if curl -sf http://localhost:8080 | grep -qi "Welcome to nginx"; then
  echo "PASS: serving default nginx page (volume not mounted — broken state confirmed)"
elif curl -sf http://localhost:8080 | grep -qi "Devleep is live"; then
  echo "WARN: already serving correct content — scenario may have already been fixed"
else
  echo "FAIL: unexpected content at port 8080"
  ERRORS=$((ERRORS + 1))
fi

# The real site should exist on the host
if [[ -f /opt/site/index.html ]]; then
  echo "PASS: /opt/site/index.html exists on host"
else
  echo "FAIL: /opt/site/index.html missing"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
