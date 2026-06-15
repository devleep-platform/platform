#!/bin/bash
# cleanup.sh — gauntlet

systemctl stop api.service 2>/dev/null || true
systemctl disable api.service 2>/dev/null || true
rm -f /etc/systemd/system/api.service
systemctl daemon-reload 2>/dev/null || true

rm -rf /var/log/api-crash /opt/api /etc/api 2>/dev/null || true

cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html;

    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINXEOF
nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true

echo "gauntlet cleanup complete"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
