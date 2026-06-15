#!/bin/bash
# setup.sh — high-cpu
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up high-cpu scenario"

# ── The CPU hog binary ────────────────────────────────────────
cat > /usr/local/bin/dataprocessor.sh << 'PROC'
#!/bin/bash
# Data processor — simulates a runaway computation loop
# This represents a real-world bug: an infinite loop in a data pipeline

echo "dataprocessor started at $(date)" >> /var/log/dataprocessor.log

# Simulate CPU-intensive work: string operations and math
while true; do
  # Expensive: repeated string concatenation in a loop
  RESULT=""
  for i in $(seq 1 1000); do
    RESULT="${RESULT}x"
  done
  # Expensive: arithmetic
  echo $(( RANDOM * RANDOM * RANDOM )) > /dev/null
done
PROC
chmod +x /usr/local/bin/dataprocessor.sh

# ── systemd service (has Restart=always — killing process alone won't stop it) ──
cat > /etc/systemd/system/dataprocessor.service << 'UNIT'
[Unit]
Description=Data Processor Service
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/dataprocessor.sh
Restart=always
RestartSec=3
StandardOutput=append:/var/log/dataprocessor.log
StandardError=append:/var/log/dataprocessor.log

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable dataprocessor
systemctl start dataprocessor
sleep 2

# ── Confirm it is consuming CPU ───────────────────────────────
CPU=$(ps aux --sort=-%cpu | awk 'NR==2{print $3}')
echo "dataprocessor CPU: ${CPU}%"

# ── Second CPU consumer via cron (students must find both) ───
cat > /usr/local/bin/backup-processor.sh << 'BPROC'
#!/bin/bash
# Backup processor — started via cron
while true; do
  find /usr -name "*.py" -exec md5sum {} \; > /dev/null 2>&1
done
BPROC
chmod +x /usr/local/bin/backup-processor.sh

# Add to crontab so it starts at reboot and runs now
(crontab -l 2>/dev/null | grep -v backup-processor || true
 echo "@reboot /usr/local/bin/backup-processor.sh &") | crontab -

# Start the cron-based one immediately
nohup /usr/local/bin/backup-processor.sh > /dev/null 2>&1 &
echo $! > /var/run/backup-processor.pid

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] high-cpu setup complete"
