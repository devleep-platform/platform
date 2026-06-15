#!/bin/bash
# verify.sh — lvm-challenge
set -euo pipefail
ERRORS=0

# VG must exist
if sudo vgs 2>/dev/null | grep -q datavg; then
  echo "PASS: datavg volume group exists"
else
  echo "FAIL: datavg VG missing"
  ERRORS=$((ERRORS + 1))
fi

# LV must be mounted
if df /mnt/appdata > /dev/null 2>&1; then
  echo "PASS: /mnt/appdata is mounted"
else
  echo "FAIL: /mnt/appdata not mounted"
  ERRORS=$((ERRORS + 1))
fi

# loop11 must be attached and NOT yet in LVM (available to extend)
if losetup /dev/loop11 > /dev/null 2>&1; then
  echo "PASS: /dev/loop11 is attached (available to extend VG)"
else
  echo "FAIL: /dev/loop11 not attached"
  ERRORS=$((ERRORS + 1))
fi

if sudo pvs 2>/dev/null | grep -q loop11; then
  echo "FAIL: loop11 is already in LVM — scenario not in initial broken state"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: loop11 not yet in VG (correctly available for student)"
fi

# Disk usage should be near full
USAGE=$(df /mnt/appdata 2>/dev/null | awk 'NR==2{gsub("%","",$5); print $5}')
if [[ "${USAGE:-0}" -ge 80 ]]; then
  echo "PASS: /mnt/appdata at ${USAGE}% (target >=80%)"
else
  echo "FAIL: /mnt/appdata only at ${USAGE}%"
  ERRORS=$((ERRORS + 1))
fi

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
