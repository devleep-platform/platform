#!/bin/bash
# cleanup.sh — log-flood
systemctl stop webapp-logger.service 2>/dev/null || true
systemctl disable webapp-logger.service 2>/dev/null || true
rm -f /etc/systemd/system/webapp-logger.service
rm -f /usr/local/bin/webapp-logger
systemctl daemon-reload 2>/dev/null || true
rm -rf /var/log/webapp/
rm -f /opt/diskpad.bin
rm -f /etc/logrotate.d/webapp
echo "log-flood cleanup complete"
