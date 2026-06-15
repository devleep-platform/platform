#!/bin/bash
# verify.sh — misconfigured-server
set -euo pipefail
ERRORS=0

# 1. World-writable file in /etc
if find /etc -perm -o+w -type f 2>/dev/null | grep -q .; then
  echo "PASS: world-writable file found in /etc"
else
  echo "FAIL: no world-writable file in /etc"
  ERRORS=$((ERRORS + 1))
fi

# 2. Unauthorized SUID binary
if find /usr/local -perm /4000 -type f 2>/dev/null | grep -q .; then
  echo "PASS: unauthorized SUID binary present"
else
  echo "FAIL: SUID binary not found in /usr/local"
  ERRORS=$((ERRORS + 1))
fi

# 3. UID 0 account besides root
ZERO_COUNT=$(awk -F: '$3==0{print $1}' /etc/passwd | wc -l)
if [ "$ZERO_COUNT" -ge 2 ]; then
  echo "PASS: $ZERO_COUNT UID-0 accounts (root + ghostadmin)"
else
  echo "FAIL: expected >=2 UID-0 accounts, found $ZERO_COUNT"
  ERRORS=$((ERRORS + 1))
fi

# 4. SSH root login enabled
if sudo sshd -T 2>/dev/null | grep -q "^permitrootlogin yes"; then
  echo "PASS: PermitRootLogin yes confirmed"
else
  echo "FAIL: PermitRootLogin not set to yes"
  ERRORS=$((ERRORS + 1))
fi

# 5. World-writable cron script
if [ -f /usr/local/bin/nightly-cleanup.sh ]; then
  PERM=$(stat -c '%a' /usr/local/bin/nightly-cleanup.sh)
  if echo "$PERM" | grep -qE '[2367]$'; then
    echo "PASS: world-writable cron script present ($PERM)"
  else
    echo "FAIL: cron script not world-writable ($PERM)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "FAIL: cron script /usr/local/bin/nightly-cleanup.sh missing"
  ERRORS=$((ERRORS + 1))
fi

[ $ERRORS -eq 0 ] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
