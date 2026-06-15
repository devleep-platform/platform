#!/bin/bash
# cleanup.sh — misconfigured-server

chmod 640 /etc/app-secrets.conf 2>/dev/null || true
rm -f /etc/app-secrets.conf 2>/dev/null || true

chmod u-s /usr/local/bin/debug-tool 2>/dev/null || true
rm -f /usr/local/bin/debug-tool 2>/dev/null || true

userdel ghostadmin 2>/dev/null || \
  sed -i '/^ghostadmin:/d' /etc/passwd 2>/dev/null || true

sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config 2>/dev/null || true
grep -q "^PermitRootLogin" /etc/ssh/sshd_config || echo "PermitRootLogin no" >> /etc/ssh/sshd_config
systemctl reload sshd 2>/dev/null || true

rm -f /usr/local/bin/nightly-cleanup.sh 2>/dev/null || true
crontab -l 2>/dev/null | grep -v nightly-cleanup | crontab - 2>/dev/null || true

echo "misconfigured-server cleanup complete"
