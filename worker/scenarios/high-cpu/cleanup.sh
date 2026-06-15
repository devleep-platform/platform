#!/bin/bash
# cleanup.sh — high-cpu

systemctl stop dataprocessor 2>/dev/null || true
systemctl disable dataprocessor 2>/dev/null || true
rm -f /etc/systemd/system/dataprocessor.service
systemctl daemon-reload 2>/dev/null || true

[[ -f /var/run/backup-processor.pid ]] && \
  kill $(cat /var/run/backup-processor.pid) 2>/dev/null || true
pkill -f 'backup-processor\|dataprocessor' 2>/dev/null || true

crontab -l 2>/dev/null | grep -v backup-processor | crontab - 2>/dev/null || true
rm -f /var/run/backup-processor.pid /var/log/dataprocessor.log
rm -f /usr/local/bin/dataprocessor.sh /usr/local/bin/backup-processor.sh

echo "high-cpu cleanup complete"
