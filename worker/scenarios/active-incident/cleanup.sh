#!/bin/bash
# cleanup.sh — active-incident

echo "Cleaning up active-incident scenario..."

# Stop the CPU hog
systemctl stop incident-cpu 2>/dev/null || true
systemctl disable incident-cpu 2>/dev/null || true
rm -f /etc/systemd/system/incident-cpu.service
systemctl daemon-reload 2>/dev/null || true
pkill -f incident-cpu 2>/dev/null || true

# Remove large log files
rm -f /var/log/application/service.log
rm -rf /var/log/application/

# Restore nginx config
[[ -f /etc/nginx/nginx.conf.bak ]] && \
  cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf

nginx -t 2>/dev/null && systemctl restart nginx 2>/dev/null || true

# Clean up cron
crontab -l 2>/dev/null | grep -v db-cleanup | crontab - 2>/dev/null || true
rm -f /usr/local/bin/db-cleanup.sh /usr/local/bin/incident-cpu.sh

echo "active-incident cleanup complete"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
