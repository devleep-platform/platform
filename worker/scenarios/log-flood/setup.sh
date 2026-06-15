#!/bin/bash
# setup.sh — log-flood
set -euo pipefail

mkdir -p /var/log/webapp
chown ubuntu:ubuntu /var/log/webapp

# Create a log-generating service
cat > /usr/local/bin/webapp-logger << 'LOGEOF'
#!/bin/bash
LOG=/var/log/webapp/access.log
METHODS=("GET" "POST" "GET" "GET" "PUT" "DELETE" "GET")
PATHS=("/api/users" "/api/orders" "/api/products" "/api/health" "/api/search" "/api/auth" "/")
STATUS=(200 200 200 201 404 500 302)
IPS=("10.0.1" "10.0.2" "192.168.1" "172.16.0")

while true; do
  for i in $(seq 1 50); do
    IP="${IPS[$((RANDOM % 4))]}.$((RANDOM % 254 + 1))"
    METHOD="${METHODS[$((RANDOM % 7))]}"
    PATH="${PATHS[$((RANDOM % 7))]}"
    CODE="${STATUS[$((RANDOM % 7))]}"
    BYTES=$((RANDOM % 8000 + 200))
    MS=$((RANDOM % 500 + 5))
    printf '%s - - [%s] "%s %s HTTP/1.1" %d %d %d\n' \
      "$IP" "$(date '+%d/%b/%Y:%H:%M:%S %z')" \
      "$METHOD" "$PATH" "$CODE" "$BYTES" "$MS" >> "$LOG"
  done
  sleep 0.1
done
LOGEOF
chmod +x /usr/local/bin/webapp-logger

cat > /etc/systemd/system/webapp-logger.service << 'UNITEOF'
[Unit]
Description=Webapp Access Logger

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/webapp-logger
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable --now webapp-logger.service

# Let it generate 10 seconds of initial data
sleep 10

# Pad the disk to ~60% to create urgency (varies by instance type)
DISK_SIZE=$(df / --output=size | tail -1)
TARGET_USAGE=$(( DISK_SIZE * 60 / 100 ))
CURRENT_USAGE=$(df / --output=used | tail -1)
PAD=$(( TARGET_USAGE - CURRENT_USAGE - 500000 ))
[[ $PAD -gt 0 ]] && fallocate -l "${PAD}k" /opt/diskpad.bin 2>/dev/null || true

# No logrotate config exists for this app (that is the point)
rm -f /etc/logrotate.d/webapp 2>/dev/null || true

echo "log-flood ready"
