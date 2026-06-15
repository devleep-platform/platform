#!/bin/bash
# setup.sh — multi-server
set -euo pipefail

which docker >/dev/null 2>&1 || apt-get install -y docker.io >/dev/null 2>&1

# Generate a fleet SSH key for the student
sudo -u ubuntu ssh-keygen -t ed25519 -f /home/ubuntu/.ssh/fleet_key \
  -N "" -C "fleet-access" 2>/dev/null || true
FLEET_PUBKEY=$(cat /home/ubuntu/.ssh/fleet_key.pub)

# Start 3 fleet containers
for i in 1 2 3; do
  docker rm -f "fleet-node-$i" 2>/dev/null || true
  docker run -d \
    --name "fleet-node-$i" \
    --hostname "web-$i" \
    -p "$((2220 + i)):2222" \
    -e PUID=1000 -e PGID=1000 \
    -e USER_NAME=ubuntu \
    -e PUBLIC_KEY="$FLEET_PUBKEY" \
    linuxserver/openssh-server:latest
done

sleep 10  # wait for sshd to start in all containers

# Install nginx on web-1 and web-2 only (web-3 = config drift)
for i in 1 2; do
  docker exec fleet-node-$i sh -c \
    "apk add --no-cache nginx >/dev/null 2>&1 && nginx -g 'daemon off;' &" 2>/dev/null || true
done

# Ensure ~/.ssh directory exists
mkdir -p /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh

# Set up ssh config for the fleet (idempotent: only add if web-1 not present)
if ! grep -q "Host web-1" /home/ubuntu/.ssh/config 2>/dev/null; then
  cat >> /home/ubuntu/.ssh/config << 'SSHEOF'

Host web-1
  HostName 127.0.0.1
  Port 2221
  User ubuntu
  IdentityFile ~/.ssh/fleet_key
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null

Host web-2
  HostName 127.0.0.1
  Port 2222
  User ubuntu
  IdentityFile ~/.ssh/fleet_key
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null

Host web-3
  HostName 127.0.0.1
  Port 2223
  User ubuntu
  IdentityFile ~/.ssh/fleet_key
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
SSHEOF
fi

chmod 600 /home/ubuntu/.ssh/config
chown ubuntu:ubuntu /home/ubuntu/.ssh/config /home/ubuntu/.ssh/fleet_key \
  /home/ubuntu/.ssh/fleet_key.pub 2>/dev/null || true

# Create the fleet inventory file
cat > /home/ubuntu/fleet.txt << 'INVEOF'
web-1
web-2
web-3
INVEOF
chown ubuntu:ubuntu /home/ubuntu/fleet.txt

echo "multi-server ready"
