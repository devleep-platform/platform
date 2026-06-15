#!/bin/bash
# verify.sh — limits-exhausted
set -euo pipefail
ERRORS=0

if test -x /usr/local/bin/filehandler; then
  echo "PASS: filehandler binary exists"
else
  echo "FAIL: filehandler binary missing"
  ERRORS=$((ERRORS + 1))
fi

if systemctl list-unit-files filehandler.service 2>/dev/null | grep -q filehandler; then
  echo "PASS: filehandler.service unit exists"
else
  echo "FAIL: filehandler.service unit missing"
  ERRORS=$((ERRORS + 1))
fi

# LimitNOFILE must be 50 (the broken state)
NOFILE=$(systemctl show filehandler.service 2>/dev/null | grep '^LimitNOFILE=' | cut -d= -f2)
if [[ "${NOFILE:-0}" -eq 50 ]]; then
  echo "PASS: LimitNOFILE=50 (correctly low)"
else
  echo "FAIL: LimitNOFILE=${NOFILE} — expected 50"
  ERRORS=$((ERRORS + 1))
fi

# Service should be failing (either failed or activating/restarting)
STATUS=$(systemctl is-active filehandler.service 2>/dev/null || true)
if [[ "$STATUS" == "failed" || "$STATUS" == "activating" ]]; then
  echo "PASS: service is in broken state ($STATUS)"
else
  echo "WARN: service status is '$STATUS' — may not have cycled yet"
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
