#!/bin/bash
# setup.sh — boot-misconfigured
set -euo pipefail

# Slow service A — simulates a legacy database init
cat > /etc/systemd/system/legacy-db-init.service << 'UNITEOF'
[Unit]
Description=Legacy Database Initializer
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'sleep 8 && echo "legacy-db-init: done"'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNITEOF

# Slow service B — needlessly depends on A and is also slow
cat > /etc/systemd/system/legacy-cache-warm.service << 'UNITEOF'
[Unit]
Description=Legacy Cache Warmer
After=legacy-db-init.service
Requires=legacy-db-init.service

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'sleep 5 && echo "legacy-cache-warm: done"'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNITEOF

# Service with a broken dependency that will never start
cat > /etc/systemd/system/report-sender.service << 'UNITEOF'
[Unit]
Description=Report Sender
After=nonexistent-message-broker.service
Requires=nonexistent-message-broker.service

[Service]
Type=simple
ExecStart=/usr/bin/echo "Sending reports"
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable legacy-db-init.service \
                legacy-cache-warm.service \
                report-sender.service 2>/dev/null

# Start them to simulate a real boot having run
systemctl start legacy-db-init.service 2>/dev/null || true
systemctl start legacy-cache-warm.service 2>/dev/null || true
systemctl start report-sender.service 2>/dev/null || true

echo "boot-misconfigured ready"
