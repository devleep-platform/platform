#!/bin/bash
# setup.sh — disk-full
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up disk-full scenario"

apt-get install -y -qq nginx 2>/dev/null

mkdir -p /var/log/webapp
chown ubuntu:ubuntu /var/log/webapp

# ── Calculate how much to fill ────────────────────────────────
# Target: 92% usage. Never exceed 95% to prevent instance instability.
DISK_SIZE_KB=$(df / --output=size | tail -1)
CURRENT_USED_KB=$(df / --output=used | tail -1)
TARGET_USED_KB=$(( DISK_SIZE_KB * 92 / 100 ))
FILL_KB=$(( TARGET_USED_KB - CURRENT_USED_KB - 204800 ))  # 200MB safety headroom

if [[ $FILL_KB -lt 102400 ]]; then
  echo "Disk already at target level, creating minimum fill"
  FILL_KB=102400  # at least 100MB
fi

echo "Filling $((FILL_KB / 1024))MB of disk space..."

# Create realistic-looking log files
# Main large log (active — students must TRUNCATE not rm)
python3 -c "
import random, datetime, sys

with open('/var/log/webapp/access.log', 'w') as f:
    methods = ['GET', 'POST', 'GET', 'GET', 'PUT']
    paths = ['/api/v1/users', '/api/v1/orders', '/health', '/api/v2/products']
    for i in range(800000):
        ip = f'10.0.{random.randint(0,5)}.{random.randint(1,254)}'
        method = random.choice(methods)
        path = random.choice(paths)
        code = random.choices([200,201,404,500], weights=[70,10,15,5])[0]
        ms = random.randint(5, 500)
        f.write(f'{ip} - - [01/Jun/2026:10:00:00 +0000] \"{method} {path} HTTP/1.1\" {code} {random.randint(200,5000)} {ms}\n')
" 2>/dev/null &
PY_PID=$!

# While Python fills, also create rotated log files that are safe to delete
dd if=/dev/zero bs=1M count=50 of=/var/log/webapp/access.log.1 2>/dev/null || true
dd if=/dev/zero bs=1M count=30 of=/var/log/webapp/access.log.2 2>/dev/null || true
dd if=/dev/zero bs=1M count=20 of=/var/log/webapp/access.log.3 2>/dev/null || true

for i in 1 2 3; do
  gzip -f /var/log/webapp/access.log.$i 2>/dev/null || true
done

# Wait for Python to finish
wait $PY_PID 2>/dev/null || true

# Check if we hit target
CURRENT_PCT=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
echo "Current disk usage: ${CURRENT_PCT}%"

# If still under target, add padding
if [[ $CURRENT_PCT -lt 88 ]]; then
  REMAINING_KB=$(( (DISK_SIZE_KB * 92 / 100) - $(df / --output=used | tail -1) - 102400 ))
  [[ $REMAINING_KB -gt 0 ]] && \
    dd if=/dev/zero bs=1M count=$((REMAINING_KB/1024)) of=/var/log/webapp/error.log 2>/dev/null || true
fi

# ── Start a process that keeps writing (makes log truncation interesting) ─
cat > /usr/local/bin/webapp-logger.sh << 'LOGGER'
#!/bin/bash
while true; do
  echo "$(date '+%Y-%m-%dT%H:%M:%S') INFO webapp: request processed" >> /var/log/webapp/access.log
  sleep 0.5
done
LOGGER
chmod +x /usr/local/bin/webapp-logger.sh
nohup /usr/local/bin/webapp-logger.sh > /dev/null 2>&1 &
echo $! > /var/run/webapp-logger.pid

# ── nginx: log writes are now failing ───────────────────────
systemctl restart nginx 2>/dev/null || true

# Inject error messages into syslog
logger -p user.err "kernel: EXT4-fs error: no space left on device"
logger -p daemon.err "nginx: open() \"/var/log/nginx/access.log\" failed (28: No space left on device)"

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] disk-full setup complete ($(df / | awk 'NR==2{print $5}') used)"
