#!/bin/bash
# setup.sh — broken-nginx
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up broken-nginx scenario"

apt-get install -y -qq nginx 2>/dev/null

# Ensure nginx was running cleanly first (realistic: it was working before)
mkdir -p /var/www/html
echo "<h1>Web App</h1>" > /var/www/html/index.html
cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    root /var/www/html;

    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
NGINXEOF

nginx -t 2>/dev/null && systemctl start nginx 2>/dev/null || true

# Back up the working config (students will discover this exists)
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# ── Inject the break ─────────────────────────────────────────
# Add an invalid directive to the http block in nginx.conf
# This is a realistic mistake: an employee added a custom directive
# that is not valid. nginx reports the exact line.
python3 - << 'PYEOF'
with open('/etc/nginx/nginx.conf', 'r') as f:
    content = f.read()

# Find the http { block and inject the bad directive after opening brace
bad_config = content.replace(
    'http {\n',
    'http {\n    # Added by ops team - DO NOT REMOVE\n    upstream_keepalive_poolsize 64;\n\n',
    1
)

with open('/etc/nginx/nginx.conf', 'w') as f:
    f.write(bad_config)
PYEOF

# Restart will now fail
systemctl restart nginx 2>/dev/null || true

# Inject realistic error into logs for context
logger -t nginx -p daemon.err "nginx: [emerg] unknown directive \"upstream_keepalive_poolsize\" in /etc/nginx/nginx.conf:$(grep -n upstream_keepalive /etc/nginx/nginx.conf | head -1 | cut -d: -f1)"

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] broken-nginx setup complete — nginx is down"
