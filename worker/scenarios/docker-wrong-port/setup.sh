#!/bin/bash
# setup.sh — docker-wrong-port
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up docker-wrong-port scenario"

# Run nginx with intentionally wrong host port (9999 instead of 8080)
docker run -d \
  --name webserver \
  --restart unless-stopped \
  -p 9999:80 \
  nginx:latest

cat <<'EOF' > /home/student/README.txt
INCIDENT: The web app is unreachable.
Monitoring reports: port 8080 on this host returns connection refused.
The container was deployed 20 minutes ago and nobody can reach it.

Expected: curl http://localhost:8080 returns 200
Current:  connection refused

Your job: find what's wrong and make the app reachable on port 8080.
EOF

chown student:student /home/student/README.txt
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] docker-wrong-port setup complete"
