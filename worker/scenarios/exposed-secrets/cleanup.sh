#!/bin/bash
# cleanup.sh — exposed-secrets

rm -rf /opt/app 2>/dev/null || true
rm -f /home/ubuntu/.env \
      /home/ubuntu/.gitignore \
      /var/log/security-alerts.log 2>/dev/null || true

echo "exposed-secrets cleanup complete"
