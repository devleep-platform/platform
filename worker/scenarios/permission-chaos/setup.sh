#!/bin/bash
# setup.sh — permission-chaos
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up permission-chaos scenario"

apt-get install -y -qq nginx 2>/dev/null

# Start nginx cleanly first (it was working)
mkdir -p /var/www/html /var/www/webapp/static /var/www/webapp/uploads
cat > /var/www/html/index.html << 'HTML'
<h1>Company Portal</h1>
HTML
cat > /var/www/webapp/static/app.css << 'CSS'
body { font-family: sans-serif; }
CSS

cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    root /var/www/webapp;
    index index.html;

    location /static/ {
        alias /var/www/webapp/static/;
    }

    location /uploads/ {
        alias /var/www/webapp/uploads/;
    }

    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGINX

nginx -t 2>/dev/null && systemctl start nginx 2>/dev/null || true

# Create a service account
id webapp 2>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin webapp

# Create app config
mkdir -p /opt/webapp/{conf,logs,run}
cat > /opt/webapp/conf/database.conf << 'CONF'
host=db.internal
port=5432
user=webapp
name=production
CONF

# ── Inject the permission chaos ───────────────────────────────
# Problem 1: nginx cannot read the web content (wrong owner, too restrictive)
chown -R root:root /var/www/webapp/
chmod -R 700 /var/www/webapp/     # rwx-----  — only root can read
chmod 600 /var/www/webapp/static/app.css

# Problem 2: nginx cannot write to its log directory
chmod 600 /var/log/nginx/          2>/dev/null || true
chown root:root /var/log/nginx/    2>/dev/null || true

# Problem 3: webapp service account cannot read its own config
chown root:root /opt/webapp/conf/database.conf
chmod 600 /opt/webapp/conf/database.conf

# Problem 4: uploads directory has dangerous world-write permission
# (correct discovery: student should RESTRICT this one, not open it more)
chmod 777 /var/www/webapp/uploads/
chown root:root /var/www/webapp/uploads/

# Log that something went wrong
systemctl restart nginx 2>/dev/null || true
logger -t nginx -p daemon.err "Permission denied: cannot open /var/www/webapp/index.html"

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] permission-chaos setup complete"
echo "Broken state:"
echo "  /var/www/webapp: $(stat -c '%a %U:%G' /var/www/webapp/)"
echo "  /var/log/nginx: $(stat -c '%a %U:%G' /var/log/nginx/ 2>/dev/null)"
echo "  /opt/webapp/conf/database.conf: $(stat -c '%a %U:%G' /opt/webapp/conf/database.conf)"
echo "  /var/www/webapp/uploads: $(stat -c '%a %U:%G' /var/www/webapp/uploads/)"
