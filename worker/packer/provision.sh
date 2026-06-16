#!/bin/bash
# Devleep golden AMI provisioner — bakes all lab software into a public AMI.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "[$(date)] Waiting for cloud-init to finish..."
cloud-init status --wait || true

# ============================================================
# Base packages (includes Docker CE prerequisites)
# ============================================================
echo "[$(date)] Installing base packages..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  curl wget git vim nano htop net-tools jq python3 python3-pip gcc libc6-dev \
  ca-certificates gnupg lsb-release
echo "[$(date)] ✓ Base packages installed"

# ============================================================
# restore-sudo SUID recovery binary
# Lets the worker restore sudo if a student breaks its setuid bit.
# Must be a compiled ELF binary — shell scripts cannot be SUID on Linux.
# ============================================================
cat > /tmp/restore_sudo.c << 'RESTORE_EOF'
#include <unistd.h>
#include <sys/stat.h>
int main(void) {
    chown("/usr/bin/sudo", 0, 0);
    chmod("/usr/bin/sudo", 04755);
    return 0;
}
RESTORE_EOF
gcc -o /tmp/restore-sudo /tmp/restore_sudo.c
sudo mv /tmp/restore-sudo /usr/local/bin/restore-sudo
sudo chown root:root /usr/local/bin/restore-sudo
sudo chmod 4755 /usr/local/bin/restore-sudo
rm /tmp/restore_sudo.c
echo "[$(date)] ✓ restore-sudo binary installed"

# ============================================================
# Docker CE
# ============================================================
echo "[$(date)] Installing Docker CE..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
echo "[$(date)] ✓ Docker CE installed"

# ============================================================
# Pre-pull Docker images used by labs
# ============================================================
echo "[$(date)] Pre-pulling Docker images..."
sudo docker pull nginx:latest       && echo "[$(date)] ✓ nginx:latest"
sudo docker pull nginx:1.24         && echo "[$(date)] ✓ nginx:1.24"
sudo docker pull nginx:1.20         && echo "[$(date)] ✓ nginx:1.20"
sudo docker pull alpine:latest      && echo "[$(date)] ✓ alpine:latest"
sudo docker pull python:3.11-alpine && echo "[$(date)] ✓ python:3.11-alpine"
echo "[$(date)] ✓ Image pre-pull complete"

# ============================================================
# cloudflared binary (service installed per-session via token)
# ============================================================
echo "[$(date)] Installing cloudflared..."
for attempt in 1 2 3; do
  if sudo curl -fsSL --connect-timeout 30 --max-time 120 \
      https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
      -o /usr/local/bin/cloudflared; then
    SIZE=$(stat -c%s /usr/local/bin/cloudflared 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 1000000 ]; then
      sudo chmod +x /usr/local/bin/cloudflared
      echo "[$(date)] ✓ cloudflared installed ($SIZE bytes)"
      break
    fi
  fi
  echo "[$(date)] cloudflared attempt $attempt/3 failed, retrying..."
  sleep 5
done

# ============================================================
# ttyd binary + service
# ============================================================
echo "[$(date)] Installing ttyd..."
TTYD_URL="https://github.com/tsl0922/ttyd/releases/download/1.7.4/ttyd.x86_64"
for attempt in 1 2 3; do
  if sudo curl -fsSL --connect-timeout 30 --max-time 120 -o /usr/local/bin/ttyd "$TTYD_URL"; then
    SIZE=$(stat -c%s /usr/local/bin/ttyd 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 100000 ]; then
      sudo chmod 755 /usr/local/bin/ttyd
      echo "[$(date)] ✓ ttyd installed ($SIZE bytes)"
      break
    fi
  fi
  echo "[$(date)] ttyd attempt $attempt/3 failed, retrying..."
  sleep 5
done

sudo tee /usr/local/bin/start-ttyd.sh << 'TTYD_EOF'
#!/bin/bash
/usr/local/bin/ttyd \
  --port 7681 \
  --writable \
  -t fontSize=14 \
  -t fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" \
  -t cursorBlink=true \
  -t customGlyphs=true \
  -t theme='{"background": "#0A0D12", "foreground": "#d8dee9", "cursor": "#22d3ee", "selectionBackground": "#334155", "black": "#11141D", "red": "#ffb4ab", "green": "#34d399", "yellow": "#fde047", "blue": "#60a5fa", "magenta": "#c084fc", "cyan": "#22d3ee", "white": "#e1e2ec"}' \
  su - ubuntu
TTYD_EOF
sudo chmod +x /usr/local/bin/start-ttyd.sh

sudo tee /etc/systemd/system/ttyd.service << 'SVC_EOF'
[Unit]
Description=ttyd terminal server
After=network.target docker.service

[Service]
ExecStart=/usr/local/bin/start-ttyd.sh
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVC_EOF

sudo systemctl daemon-reload
echo "[$(date)] ✓ ttyd installed (service not yet enabled — userdata enables it)"

# ============================================================
# student user
# ============================================================
if ! id student &>/dev/null; then
  sudo useradd -m -s /bin/bash -G docker student
  echo "[$(date)] ✓ student user created"
fi

# ============================================================
# Shell customisation
# ============================================================
sudo tee -a /home/ubuntu/.bashrc << 'BASH_EOF'

export PS1='\[\e[38;5;51m\]\u\[\e[0m\]@\[\e[38;5;40m\]\h\[\e[0m\]:\[\e[38;5;226m\]\w\[\e[0m\]\$ '
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias cls='clear'
alias d='docker'
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
BASH_EOF
sudo chown ubuntu:ubuntu /home/ubuntu/.bashrc

# ============================================================
# sshd: disable PTR lookup to prevent 60s banner hang via Cloudflare Tunnel
# ============================================================
echo "UseDNS no" | sudo tee -a /etc/ssh/sshd_config

# ============================================================
# Clean up to minimise AMI size
# ============================================================
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

echo "[$(date)] ========== PROVISION COMPLETE =========="
