#!/bin/bash
# setup.sh — route-broken
set -euo pipefail

# Start an HTTP service on a non-standard port to simulate an internal service
cat > /usr/local/bin/internal-api << 'SVCEOF'
#!/bin/bash
while true; do
  printf "HTTP/1.0 200 OK\r\nContent-Length: 21\r\n\r\ninternal-api: running" | \
    nc -l -p 8099 2>/dev/null || sleep 1
done
SVCEOF
chmod +x /usr/local/bin/internal-api
nohup /usr/local/bin/internal-api >/dev/null 2>&1 &

# Add a blackhole route for the subnet that "should" reach the internal service
ip route add blackhole 192.168.100.0/24 2>/dev/null || \
  ip route add 192.168.100.0/24 via 10.0.0.254 2>/dev/null || true

# Create an app that logs failures
cat > /usr/local/bin/app-connector << 'APPEOF'
#!/bin/bash
while true; do
  curl -s --max-time 2 http://192.168.100.10:8099/health >/dev/null 2>&1 || \
    echo "$(date '+%Y-%m-%dT%H:%M:%S') ERROR connector: dial tcp 192.168.100.10:8099: connect: no route to host" \
      >> /var/log/app.log
  sleep 10
done
APPEOF
chmod +x /usr/local/bin/app-connector
nohup /usr/local/bin/app-connector >/dev/null 2>&1 &

# Pre-fill the log with 20 minutes of errors to show the problem has been ongoing
mkdir -p /var/log
for i in $(seq 1 120); do
  OFFSET=$(( (120 - i) * 10 ))
  echo "$(date -d "$OFFSET seconds ago" '+%Y-%m-%dT%H:%M:%S') ERROR connector: dial tcp 192.168.100.10:8099: connect: no route to host" \
    >> /var/log/app.log 2>/dev/null || \
  echo "$(date '+%Y-%m-%dT%H:%M:%S') ERROR connector: no route to host" \
    >> /var/log/app.log
done

echo "route-broken ready"
