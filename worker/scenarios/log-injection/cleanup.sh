#!/bin/bash
# cleanup.sh — log-injection
# Truncate the injected logs, preserve system logs
truncate -s 0 /var/log/app.log
# Don't truncate auth.log as it's a system log — real entries should stay
# Remove only the injected lines
grep -v "185.234.218.42\|45.142.212.100\|103.75.186.49\|192.168.44.78" \
  /var/log/auth.log > /tmp/auth-clean.log && \
  mv /tmp/auth-clean.log /var/log/auth.log 2>/dev/null || true
echo "log-injection cleanup complete"
