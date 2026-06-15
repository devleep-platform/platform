#!/bin/bash
# setup.sh — ssh-lab
set -euo pipefail

# Ensure Docker is present
which docker >/dev/null 2>&1 || apt-get install -y docker.io >/dev/null 2>&1

# Create the labuser on the HOST so student can ssh to localhost too
id labuser 2>/dev/null || useradd -m -s /bin/bash labuser
echo "labuser:labpassword" | chpasswd

# Allow password auth temporarily for bootstrap (student will then switch to keys)
grep -q "^PasswordAuthentication" /etc/ssh/sshd_config && \
  sed -i 's/^PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config || \
  echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
systemctl reload sshd

# Start the Docker target container
docker pull linuxserver/openssh-server:latest >/dev/null 2>&1
docker rm -f ssh-target 2>/dev/null || true
docker run -d \
  --name ssh-target \
  -p 2222:2222 \
  -e PUID=1000 \
  -e PGID=1000 \
  -e USER_NAME=labuser \
  -e PASSWORD_ACCESS=true \
  -e USER_PASSWORD=labpassword \
  linuxserver/openssh-server:latest

# Wait for container sshd to be ready
for i in $(seq 1 15); do
  docker exec ssh-target sshd -t 2>/dev/null && break || sleep 2
done

# Start a minimal HTTP service on port 8080 inside the container
# Used in the port-forwarding step
docker exec -d ssh-target sh -c \
  'while true; do printf "HTTP/1.0 200 OK\r\nContent-Length: 7\r\n\r\nrunning" | nc -l -p 8080 2>/dev/null || true; done'

echo "ssh-lab ready"
