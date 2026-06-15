#!/bin/bash
# cleanup.sh — boot-misconfigured
systemctl stop legacy-db-init.service legacy-cache-warm.service report-sender.service 2>/dev/null || true
systemctl disable legacy-db-init.service legacy-cache-warm.service report-sender.service 2>/dev/null || true
rm -f /etc/systemd/system/legacy-db-init.service \
      /etc/systemd/system/legacy-cache-warm.service \
      /etc/systemd/system/report-sender.service
systemctl daemon-reload 2>/dev/null || true
echo "boot-misconfigured cleanup complete"
