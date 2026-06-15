#!/bin/bash
# setup.sh — docker-missing-env
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up docker-missing-env scenario"

mkdir -p /opt/lab/api-app
cat <<'DOCKERFILE' > /opt/lab/api-app/Dockerfile
FROM python:3.11-alpine
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
DOCKERFILE

cat <<'PYAPP' > /opt/lab/api-app/app.py
import os
import sys

required = ["DB_HOST", "DB_PORT", "APP_SECRET"]
missing = [v for v in required if not os.environ.get(v)]

if missing:
    print(f"FATAL: Missing required environment variables: {', '.join(missing)}", file=sys.stderr)
    sys.exit(1)

print(f"Connected to {os.environ['DB_HOST']}:{os.environ['DB_PORT']}")
print("API server starting on :5000")

import time
while True:
    time.sleep(60)
PYAPP

docker build -t api-app:latest /opt/lab/api-app

# Run WITHOUT required env vars — exits immediately
docker run -d --name api-app --restart on-failure api-app:latest || true

cat <<'EOF' > /home/student/README.txt
INCIDENT: api-app container keeps restarting.
Team just deployed a new service. It exits within seconds of starting.

Expected: container stays running, logs show "API server starting on :5000"
Current:  container exits with a non-zero exit code

Your job:
  1. Find out why the container is crashing
  2. Fix it so the container runs successfully

The app needs certain environment variables to start. Figure out which ones.
EOF

chown student:student /home/student/README.txt
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] docker-missing-env setup complete"
