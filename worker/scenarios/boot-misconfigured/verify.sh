#!/bin/bash
# verify.sh — boot-misconfigured
set -euo pipefail
ERRORS=0

for SVC in legacy-db-init.service legacy-cache-warm.service report-sender.service; do
  if systemctl list-unit-files "$SVC" 2>/dev/null | grep -q "$SVC"; then
    echo "PASS: $SVC unit exists"
  else
    echo "FAIL: $SVC unit missing"
    ERRORS=$((ERRORS + 1))
  fi
done

# legacy-db-init must be enabled (contributes to slow boot)
if systemctl is-enabled legacy-db-init.service > /dev/null 2>&1; then
  echo "PASS: legacy-db-init is enabled on boot"
else
  echo "FAIL: legacy-db-init is not enabled"
  ERRORS=$((ERRORS + 1))
fi

# report-sender must be in failed or inactive state (broken dependency)
STATUS=$(systemctl is-active report-sender.service 2>/dev/null || true)
if [[ "$STATUS" == "failed" || "$STATUS" == "inactive" ]]; then
  echo "PASS: report-sender is in broken state ($STATUS — as expected)"
else
  echo "WARN: report-sender status is '$STATUS' — may not have attempted start yet"
fi

# legacy-cache-warm must Require legacy-db-init (sequential chain)
if systemctl show legacy-cache-warm.service 2>/dev/null | grep -q 'Requires=.*legacy-db-init'; then
  echo "PASS: legacy-cache-warm has sequential dependency on legacy-db-init"
else
  echo "FAIL: sequential dependency not configured correctly"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
