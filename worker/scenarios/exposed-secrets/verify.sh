#!/bin/bash
# verify.sh — exposed-secrets
set -euo pipefail
ERRORS=0

# Git repo with at least 3 commits
if [ -d /opt/app/.git ]; then
  COMMITS=$(sudo -u ubuntu git -C /opt/app log --oneline 2>/dev/null | wc -l)
  if [ "$COMMITS" -ge 3 ]; then
    echo "PASS: git repo with $COMMITS commits"
  else
    echo "FAIL: expected >=3 commits, found $COMMITS"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "FAIL: git repo not found at /opt/app"
  ERRORS=$((ERRORS + 1))
fi

# AWS key must be present in git history
if sudo -u ubuntu git -C /opt/app log --all -p 2>/dev/null | grep -q "AKIAIOSFODNN7EXAMPLE"; then
  echo "PASS: AWS key found in git history"
else
  echo "FAIL: AWS key not found in git history"
  ERRORS=$((ERRORS + 1))
fi

# Plaintext secrets on filesystem (live files, not .git)
LIVE_COUNT=$(grep -rl "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI\|DB_PASSWORD=Tr0ub4dor" \
  /home/ubuntu /opt/app 2>/dev/null | grep -v ".git/" | wc -l)
if [ "$LIVE_COUNT" -ge 1 ]; then
  echo "PASS: $LIVE_COUNT live file(s) with plaintext secrets"
else
  echo "FAIL: live plaintext secrets not found"
  ERRORS=$((ERRORS + 1))
fi

[ $ERRORS -eq 0 ] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL ($ERRORS errors)"; exit 1; }
