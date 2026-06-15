#!/bin/bash
# setup.sh — limits-exhausted
set -euo pipefail

mkdir -p /opt/filehandler /var/log

# Create the application binary
cat > /usr/local/bin/filehandler << 'APPEOF'
#!/bin/bash
# Simulates an application that needs many file descriptors
TMPDIR=/tmp/app-connections
mkdir -p "$TMPDIR"

echo "Starting filehandler PID $$"
echo "Current fd limit: $(ulimit -n)"

# Try to open 200 file handles (will fail when limit is 50)
OPENED=0
for i in $(seq 1 200); do
  exec {fd}<>/tmp/app-connections/conn-$i.sock 2>/dev/null && ((OPENED++)) || {
    echo "ERROR: too many open files (opened $OPENED, failed at $i)" >&2
    exit 1
  }
done
echo "Opened $OPENED file descriptors successfully"
sleep infinity
APPEOF
chmod +x /usr/local/bin/filehandler

# Create systemd unit with a low fd limit to simulate the problem
cat > /etc/systemd/system/filehandler.service << 'UNITEOF'
[Unit]
Description=File Handler Application
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/filehandler
LimitNOFILE=50
Restart=on-failure
RestartSec=15
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable --now filehandler.service 2>/dev/null || true
sleep 5

# Pre-fill the log with error history
for i in $(seq 1 40); do
  OFFSET=$(( (40 - i) * 15 ))
  echo "$(date -d "$OFFSET seconds ago" '+%b %d %H:%M:%S') $(hostname) filehandler[$$]: ERROR: too many open files (opened 48, failed at 49)" \
    >> /var/log/app.log 2>/dev/null || \
  echo "$(date '+%b %d %H:%M:%S') $(hostname) filehandler: ERROR: too many open files" \
    >> /var/log/app.log
done

echo "limits-exhausted ready"
