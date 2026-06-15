#!/bin/bash
# setup.sh — silent-failure
set -euo pipefail

# Create the mystery binary that fails silently
cat > /usr/local/bin/dataprocessor << 'BINEOF'
#!/bin/bash
# No output. No logs. Just exits 1. Student must strace to understand why.

# Issue 1: reads a config that does not exist
cat /etc/dataprocessor/config.yaml 2>/dev/null

# Issue 2: checks for a socket that is not there
test -S /var/run/dataprocessor/control.sock 2>/dev/null

# Issue 3: tries to read credentials it cannot access
cat /var/secure/dataprocessor/credentials.dat 2>/dev/null

# Pretends to do work then exits
exit 1
BINEOF
chmod +x /usr/local/bin/dataprocessor

# Create the credentials file with intentionally wrong permissions
mkdir -p /var/secure/dataprocessor
echo "api_key=prod-secret-8f3k2p" > /var/secure/dataprocessor/credentials.dat
chmod 600 /var/secure/dataprocessor/credentials.dat
chown root:root /var/secure/dataprocessor/credentials.dat

# Note: /etc/dataprocessor/ intentionally NOT created
# Note: /var/run/dataprocessor/ intentionally NOT created

# Create the systemd service
cat > /etc/systemd/system/dataprocessor.service << 'UNITEOF'
[Unit]
Description=Data Processor Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/dataprocessor
Restart=on-failure
RestartSec=30
StandardOutput=null
StandardError=null

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable --now dataprocessor.service 2>/dev/null || true
sleep 3

echo "silent-failure ready"
