#!/bin/bash
# setup.sh — cert-expired
set -euo pipefail

apt-get install -y nginx openssl >/dev/null 2>&1

mkdir -p /etc/nginx/ssl /var/www/html

# Create a certificate expiring in 1 day (monitoring alert just fired)
openssl req -x509 -nodes \
  -days 1 \
  -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/server.key \
  -out /etc/nginx/ssl/server.crt \
  -subj "/CN=app.lab.internal/O=Lab Corp/C=US" \
  2>/dev/null
chmod 600 /etc/nginx/ssl/server.key

# Write nginx config
cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/html;

    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}

server {
    listen 443 ssl default_server;
    server_name app.lab.internal;

    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    root /var/www/html;

    location / {
        return 200 'Application running';
        add_header Content-Type text/plain;
    }

    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINXEOF

echo "<h1>Lab Application</h1>" > /var/www/html/index.html
nginx -t >/dev/null 2>&1 && systemctl restart nginx

# Inject the monitoring alert into the system log
logger -p user.crit "CERT-MONITOR: Certificate for app.lab.internal expires in less than 24 hours"
echo "$(date '+%Y-%m-%d %H:%M:%S') CRITICAL: TLS certificate /etc/nginx/ssl/server.crt expires in 0 days 23:59:00" \
  >> /var/log/cert-monitor.log

echo "cert-expired ready"
