#!/bin/bash
# setup.sh — hello-linux
set -euo pipefail
exec > >(tee -a /var/log/scenario-setup.log) 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up hello-linux scenario"

# ── Tools ─────────────────────────────────────────────────────
apt-get update -qq 2>/dev/null
apt-get install -y -qq \
  nginx curl jq tree \
  net-tools sysstat iotop htop \
  strace lsof tcpdump \
  vim nano less \
  rsync gpg \
  auditd fail2ban \
  python3 python3-pip 2>/dev/null

# ── nginx ─────────────────────────────────────────────────────
mkdir -p /var/www/html
cat > /var/www/html/index.html << 'HTML'
<!DOCTYPE html>
<html><head><title>Lab Environment</title></head>
<body><h1>Lab Environment Running</h1><p>nginx is active.</p></body></html>
HTML

cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html;

    location /health {
        return 200 'ok\n';
        add_header Content-Type text/plain;
    }

    location /api/version {
        return 200 '{"version":"1.0.0","env":"lab"}\n';
        add_header Content-Type application/json;
    }

    access_log /var/log/nginx/access.log;
    error_log  /var/log/nginx/error.log;
}
NGINX

nginx -t 2>/dev/null && systemctl restart nginx
systemctl enable nginx

# ── Realistic log files ───────────────────────────────────────
mkdir -p /var/log
touch /var/log/app.log /var/log/auth.log

# App log: 300 lines over last hour
for i in $(seq 1 300); do
  AGO=$(( (300 - i) * 12 ))
  TS=$(date -d "$AGO seconds ago" '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')
  MS=$(( RANDOM % 200 + 5 ))
  case $(( i % 15 )) in
    0) echo "$TS ERROR api: upstream connect error to backend:3000" >> /var/log/app.log ;;
    1) echo "$TS WARN  cache: connection pool near limit (89/100)" >> /var/log/app.log ;;
    *) echo "$TS INFO  api: GET /api/users 200 ${MS}ms" >> /var/log/app.log ;;
  esac
done

# Auth log: realistic SSH activity
for i in $(seq 1 20); do
  AGO=$(( (20 - i) * 120 ))
  TS=$(date -d "$AGO minutes ago" '+%b %d %H:%M:%S' 2>/dev/null || date '+%b %d %H:%M:%S')
  echo "$TS $(hostname) sshd[$$]: Accepted publickey for ubuntu from 10.0.0.5 port 5${i}022 ssh2" >> /var/log/auth.log
done

# ── Application directory ─────────────────────────────────────
mkdir -p /opt/myapp/{bin,conf,logs,data}
cat > /opt/myapp/conf/app.conf << 'CONF'
version=1.0.0
port=8080
env=production
db_host=db.internal
db_port=5432
max_connections=100
CONF
chown -R ubuntu:ubuntu /opt/myapp

# ── Crontab with one working entry ───────────────────────────
(crontab -l 2>/dev/null | grep -v health-check || true
 echo "*/5 * * * * /bin/date >> /tmp/cron-alive.txt") | crontab -

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] hello-linux setup complete"
