#!/bin/bash
# setup.sh — docker-base
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up docker-base scenario"

# Run a named nginx container so there is something to inspect
docker run -d \
  --name webserver \
  --restart unless-stopped \
  -p 8080:80 \
  nginx:latest

cat <<'EOF' > /etc/motd

  ┌─────────────────────────────────────────┐
  │  DEVLEEP // DOCKER LAB                  │
  │  A Docker environment is ready.         │
  │  Start with: docker ps                  │
  └─────────────────────────────────────────┘

EOF

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] docker-base setup complete"
