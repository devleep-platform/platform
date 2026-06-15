#!/bin/bash
# setup.sh — gauntlet
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up gauntlet scenario"

apt-get install -y -qq nginx python3 2>/dev/null

# ── API binary — exits 1 if config is missing (simulates deployment bug) ──────
mkdir -p /opt/api/bin /opt/api/config-backup

cat > /opt/api/bin/api << 'APIEOF'
#!/usr/bin/env python3
import sys, os

config_path = "/etc/api/config.yaml"
if not os.path.exists(config_path):
    print(f"FATAL: config not found: {config_path}", file=sys.stderr)
    sys.exit(1)

import http.server, socketserver

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")
    def log_message(self, *a): pass

print("api: listening on port 3000", flush=True)
with socketserver.TCPServer(("", 3000), Handler) as srv:
    srv.serve_forever()
APIEOF
chmod +x /opt/api/bin/api

# Backup binary — identical, works once config exists
cp /opt/api/bin/api /opt/api/bin/api.bak

# Backup config the student can copy into place
cat > /opt/api/config-backup/config.yaml << 'CONFEOF'
# api.service configuration
server:
  port: 3000
  env: production
database:
  host: db.internal
  name: app_production
CONFEOF

# Note: /etc/api/config.yaml intentionally NOT created — this is the deployment bug

# ── systemd service for api ────────────────────────────────────────────────────
cat > /etc/systemd/system/api.service << 'UNITEOF'
[Unit]
Description=API Service
After=network.target

[Service]
Type=simple
ExecStart=/opt/api/bin/api
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable api.service 2>/dev/null || true
# Start — will fail 3 times and hit StartLimitBurst, then stop retrying
systemctl start api.service 2>/dev/null || true
sleep 20

# ── nginx proxying to API ──────────────────────────────────────────────────────
mkdir -p /var/www/html
echo "<h1>Production App</h1>" > /var/www/html/index.html

cat > /etc/nginx/sites-available/default << 'NGINXEOF'
upstream api_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80 default_server;
    server_name _;

    location /health {
        proxy_pass         http://api_backend/;
        proxy_connect_timeout 2s;
        proxy_read_timeout    5s;
    }

    location / {
        proxy_pass         http://api_backend/;
        proxy_connect_timeout 2s;
        proxy_read_timeout    5s;
    }
}
NGINXEOF

nginx -t 2>/dev/null && systemctl restart nginx

# ── Fill disk to simulate crash-loop log flood ────────────────────────────────
DISK_SIZE_KB=$(df / --output=size | tail -1)
CURRENT_USED_KB=$(df / --output=used | tail -1)
TARGET_USED_KB=$(( DISK_SIZE_KB * 95 / 100 ))
FILL_KB=$(( TARGET_USED_KB - CURRENT_USED_KB - 51200 ))

mkdir -p /var/log/api-crash

if [ "$FILL_KB" -gt 102400 ]; then
  echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Filling $((FILL_KB / 1024))MB..."
  python3 - << PYEOF
import os, datetime

log_path = "/var/log/api-crash/api.log"
target_kb = $TARGET_USED_KB - 51200

with open(log_path, "w") as f:
    i = 0
    while True:
        ts = datetime.datetime.utcnow().isoformat()
        f.write(f"{ts} FATAL api: config not found: /etc/api/config.yaml\n")
        f.write(f"{ts} ERROR api: startup failed, restarting in 5s\n")
        i += 1
        if i % 100000 == 0:
            f.flush()
            result = os.popen("df / --output=used | tail -1").read().strip()
            if int(result) >= target_kb:
                break
PYEOF
fi

# Pad with a bulk file if Python fill was insufficient
CURRENT_PCT=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
if [ "${CURRENT_PCT:-0}" -lt 90 ]; then
  REMAINING=$(( (DISK_SIZE_KB * 95 / 100) - $(df / --output=used | tail -1) - 51200 ))
  [ "$REMAINING" -gt 10240 ] && \
    dd if=/dev/zero bs=1M count=$(( REMAINING / 1024 )) \
       of=/var/log/api-crash/journal-overflow.bin status=none 2>/dev/null || true
fi

# Inject incident timeline into syslog
logger -p user.crit "ALERT: Disk / at $(df / | awk 'NR==2{print $5}') — write errors" 2>/dev/null || true
logger -p user.err  "ALERT: api.service failed — StartLimitBurst exhausted" 2>/dev/null || true
logger -p user.err  "ALERT: nginx: upstream api_backend unreachable — 502 responses" 2>/dev/null || true

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] gauntlet setup complete"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
echo "api.service: $(systemctl is-active api.service 2>/dev/null || echo failed)"
echo "nginx: $(systemctl is-active nginx 2>/dev/null)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health --max-time 3 2>/dev/null || echo "000")
echo "HTTP /health: $HTTP (expected 502)"
