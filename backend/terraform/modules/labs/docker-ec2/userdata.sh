#!/bin/bash

set -e

exec > /var/log/devops-lab-bootstrap.log 2>&1

echo "Starting bootstrap..."

apt-get update -y

apt-get install -y \
  curl \
  wget \
  git \
  jq \
  vim \
  tree \
  htop \
  unzip \
  zip \
  rsync \
  tmux \
  dnsutils \
  net-tools \
  cron \
  tcpdump \
  ca-certificates \
  gnupg \
  lsb-release

# Install Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# Create student user
if ! id "student" &>/dev/null; then
  useradd -m -s /bin/bash student
  echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
fi

# Add student to docker group
usermod -aG docker student

# Pre-pull common images so lab scenarios start fast
docker pull nginx:latest
docker pull nginx:1.24
docker pull nginx:1.20
docker pull alpine:latest
docker pull python:3.11-alpine

# Workspace structure
mkdir -p /home/student/work
mkdir -p /home/student/scripts
mkdir -p /home/student/logs
mkdir -p /home/student/labs

chown -R student:student /home/student

# Platform directories
mkdir -p /opt/devops-lab/scenarios
mkdir -p /opt/devops-lab/validation
mkdir -p /opt/devops-lab/bootstrap
mkdir -p /opt/devops-lab/metadata

# Install Cloudflare Tunnel
curl -L \
https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
-o /usr/local/bin/cloudflared

chmod +x /usr/local/bin/cloudflared

cloudflared service install ${cf_tunnel_token}

systemctl enable cloudflared
systemctl start cloudflared

# Node metadata
cat <<EOF >/opt/devops-lab/metadata/node.json
{
  "node_name": "${node_name}",
  "node_role": "${node_role}"
}
EOF

echo "Bootstrap completed successfully"
