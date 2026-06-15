#!/bin/bash
# cleanup.sh — limits-exhausted
systemctl stop filehandler.service 2>/dev/null || true
systemctl disable filehandler.service 2>/dev/null || true
rm -f /etc/systemd/system/filehandler.service
rm -f /etc/systemd/system/filehandler.service.d/override.conf 2>/dev/null || true
rmdir /etc/systemd/system/filehandler.service.d 2>/dev/null || true
rm -f /usr/local/bin/filehandler
rm -rf /tmp/app-connections
systemctl daemon-reload 2>/dev/null || true
echo "limits-exhausted cleanup complete"
