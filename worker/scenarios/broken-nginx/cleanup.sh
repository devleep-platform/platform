#!/bin/bash
# cleanup.sh — broken-nginx
echo "Restoring nginx configuration"

# Restore the backup
if [[ -f /etc/nginx/nginx.conf.backup ]]; then
  cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
fi

nginx -t 2>/dev/null && systemctl restart nginx || true
