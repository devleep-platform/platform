#!/bin/bash
# setup.sh — docker-volume-not-mounted
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up docker-volume-not-mounted scenario"

# Place the real site on the host
mkdir -p /opt/site
cat <<'HTML' > /opt/site/index.html
<!DOCTYPE html>
<html>
<head><title>Devleep App</title></head>
<body><h1>Devleep is live</h1></body>
</html>
HTML

# Run nginx WITHOUT mounting /opt/site — serves default welcome page
docker run -d \
  --name webserver \
  --restart unless-stopped \
  -p 8080:80 \
  nginx:latest

cat <<'EOF' > /home/student/README.txt
INCIDENT: Website serving wrong content.
Users report the site shows the default nginx welcome page
instead of the actual application.

The site files live at /opt/site on this host.
The container should serve them at port 8080.

Expected: curl http://localhost:8080 returns "Devleep is live"
Current:  returns the default nginx welcome page

Your job: fix the container so it serves content from /opt/site.
EOF

chown student:student /home/student/README.txt
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] docker-volume-not-mounted setup complete"
