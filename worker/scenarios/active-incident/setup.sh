#!/bin/bash
# setup.sh — active-incident
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up active-incident scenario"

apt-get install -y -qq nginx 2>/dev/null

# ── Issue 1: Disk filling ─────────────────────────────────────
mkdir -p /var/log/application

# Fill to ~92% with realistic log content
python3 << 'PYEOF'
import random, datetime

import subprocess
result = subprocess.run(['df', '/', '--output=size,used'], capture_output=True, text=True)
lines = result.stdout.strip().split('\n')
size_kb = int(lines[1].split()[0])
used_kb = int(lines[1].split()[1])
target_kb = int(size_kb * 0.92)
fill_kb = target_kb - used_kb - 204800  # 200MB headroom

if fill_kb > 51200:  # only if we need at least 50MB
    with open('/var/log/application/service.log', 'w') as f:
        lines_needed = (fill_kb * 1024) // 120  # ~120 bytes per log line
        for i in range(min(lines_needed, 5000000)):
            ts = datetime.datetime.utcnow().isoformat()
            code = random.choice([200]*9 + [500])
            ms = random.randint(5, 1500)
            f.write(f'{ts} INFO  service: request /api/v1/data {code} {ms}ms user_id=usr-{random.randint(1000,9999)}\n')
    print(f"Log file created: {fill_kb//1024}MB")
else:
    print(f"Disk already near target, creating minimum fill")
    with open('/var/log/application/service.log', 'w') as f:
        for i in range(200000):
            f.write(f'2026-06-01T10:00:00 INFO service: request {i}\n')
PYEOF

# ── Issue 2: Broken nginx config ─────────────────────────────
mkdir -p /var/www/html
echo "<h1>Production App</h1>" > /var/www/html/index.html
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak 2>/dev/null || true

# Inject a multi-part config error (more realistic — looks like a merge conflict)
python3 << 'PYEOF'
with open('/etc/nginx/nginx.conf', 'r') as f:
    content = f.read()

broken = content.replace(
    'http {\n',
    '''http {
    # BEGIN MERGE CONFLICT
    worker_rlimit_files 65536;
    # END MERGE CONFLICT

''', 1)

with open('/etc/nginx/nginx.conf', 'w') as f:
    f.write(broken)
PYEOF

# nginx won't start — also can't write logs because disk is nearly full
systemctl restart nginx 2>/dev/null || true

# ── Issue 3: Runaway CPU process ──────────────────────────────
cat > /usr/local/bin/incident-cpu.sh << 'CPU'
#!/bin/bash
# This process was started by a misconfigured deployment script
# It should have exited after completing its task but loops forever
while true; do
  # Simulate expensive computation that never terminates
  for i in $(seq 1 100000); do
    echo "$i" | md5sum > /dev/null
  done
done
CPU
chmod +x /usr/local/bin/incident-cpu.sh

cat > /etc/systemd/system/incident-cpu.service << 'UNIT'
[Unit]
Description=Data Pipeline Processor
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/incident-cpu.sh
Restart=always
RestartSec=5
User=ubuntu

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable incident-cpu
systemctl start incident-cpu

# ── Issue 4: Silent cron failure ──────────────────────────────
cat > /usr/local/bin/db-cleanup.sh << 'CLEANUP'
#!/bin/bash
# Nightly database cleanup — BROKEN
# Tries to write to a directory that doesn't exist
# And uses jq which might not be in cron PATH

ARCHIVE_DIR=/data/archives/db

jq '{"status": "cleanup", "timestamp": now}' <<< '{}' > "${ARCHIVE_DIR}/$(date +%Y%m%d).json"
find "$ARCHIVE_DIR" -mtime +30 -delete
echo "Cleanup complete"
CLEANUP
chmod +x /usr/local/bin/db-cleanup.sh

(crontab -l 2>/dev/null | grep -v db-cleanup || true
 echo "0 2 * * * /usr/local/bin/db-cleanup.sh") | crontab -

# ── Inject incident timeline into logs ────────────────────────
logger -t nginx -p daemon.err "nginx: [emerg] unknown directive \"worker_rlimit_files\""
logger -t system -p user.crit "ALERT: disk usage at $(df / | awk 'NR==2{print $5}')"
logger -t system -p user.err "incident-cpu: process consuming excessive CPU resources"

sleep 5

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] active-incident setup complete"
echo ""
echo "Summary of broken state:"
echo "  Disk:   $(df -h / | awk 'NR==2{print $5}') used"
echo "  nginx:  $(systemctl is-active nginx 2>/dev/null || echo stopped)"
echo "  CPU:    $(ps aux --sort=-%cpu | awk 'NR==2{printf "%.0f%%", $3}')"
echo "  Cron:   db-cleanup configured but will fail"
