#!/bin/bash
# setup.sh — docker-container-wont-start
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up docker-container-wont-start scenario"

# Build a broken image: CMD references a binary that doesn't exist in the image
mkdir -p /opt/lab/broken-app
cat <<'DOCKERFILE' > /opt/lab/broken-app/Dockerfile
FROM alpine:latest
# Intentionally wrong: /app/start.sh does not exist in this image
CMD ["/app/start.sh"]
DOCKERFILE

docker build -t broken-app:latest /opt/lab/broken-app

# Run it — exits immediately with code 127 (file not found)
docker run -d --name broken-app --restart on-failure broken-app:latest || true

cat <<'EOF' > /home/student/README.txt
INCIDENT: The 'broken-app' container keeps exiting.
On-call says: "It was working yesterday with image v1.2."

Your job:
  1. Find out why the container keeps exiting
  2. Fix it so the container stays running

Hint: start with  docker ps -a  and  docker logs broken-app
EOF

chown student:student /home/student/README.txt
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] docker-container-wont-start setup complete"
