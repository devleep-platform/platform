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
  nginx \
  cron \
  tcpdump

# Create student user
if ! id "student" &>/dev/null; then
  useradd -m -s /bin/bash student
  echo "student ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
fi

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
