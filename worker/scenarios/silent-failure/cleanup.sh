#!/bin/bash
# cleanup.sh — silent-failure
systemctl stop dataprocessor.service 2>/dev/null || true
systemctl disable dataprocessor.service 2>/dev/null || true
rm -f /etc/systemd/system/dataprocessor.service
rm -f /usr/local/bin/dataprocessor
systemctl daemon-reload 2>/dev/null || true
rm -rf /var/secure/dataprocessor/
rm -rf /etc/dataprocessor/ /var/run/dataprocessor/ 2>/dev/null || true
rm -f /tmp/strace-failures.txt
echo "silent-failure cleanup complete"
