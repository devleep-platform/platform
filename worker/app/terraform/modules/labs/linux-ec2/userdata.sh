#!/bin/bash
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

export NODE_NAME="${node_name}"
export NODE_ROLE="${node_role}"
export CF_TUNNEL_TOKEN="${cf_tunnel_token}"
export SESSION_TOKEN="${session_token}"

echo "[$(date)] Starting userdata script..."

if [ -z "$CF_TUNNEL_TOKEN" ]; then
  echo "[$(date)] ERROR: CF_TUNNEL_TOKEN is EMPTY!"
  exit 1
fi
if [ -z "$SESSION_TOKEN" ]; then
  echo "[$(date)] ERROR: SESSION_TOKEN is EMPTY!"
  exit 1
fi

# Wait for internet connectivity
for i in 1 2 3 4 5; do
  if ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1; then
    echo "[$(date)] ✓ Internet connectivity OK"
    break
  fi
  echo "[$(date)] Waiting for internet (attempt $i/5)..."
  sleep 2
done

# ============================================================
# PHASE 1a: SSH authorized key — instant, must run first
# The public key is injected by Terraform (ephemeral ED25519 per session).
# ============================================================

mkdir -p /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
echo "${ssh_public_key}" >> /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
echo "[$(date)] ✓ SSH authorized key installed"

# ============================================================
# PHASE 1b: cloudflared + sshd fix — must run BEFORE apt work
#
# apt-get upgrade takes 5-10 min on a fresh t3.micro, which
# delays the tunnel and causes the worker to time out waiting.
# Starting cloudflared first brings the tunnel up in ~90s.
# UseDNS no prevents sshd from doing PTR lookups (~60s timeout)
# that cause the "timed out during banner exchange" error.
# ============================================================

echo "[$(date)] [PHASE 1] Installing cloudflared..."
CLOUDFLARED_OK=0
for attempt in 1 2 3; do
  if curl -fsSL --connect-timeout 15 --max-time 60 \
      https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
      -o /usr/local/bin/cloudflared; then
    SIZE=$(stat -c%s /usr/local/bin/cloudflared 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 1000000 ]; then
      chmod +x /usr/local/bin/cloudflared
      echo "[$(date)] ✓ cloudflared downloaded ($SIZE bytes)"
      CLOUDFLARED_OK=1
      break
    fi
  fi
  echo "[$(date)] cloudflared download attempt $attempt/3 failed, retrying in 5s..."
  sleep 5
done

if [ $CLOUDFLARED_OK -eq 1 ]; then
  /usr/local/bin/cloudflared service install "$CF_TUNNEL_TOKEN"
  systemctl start cloudflared.service
  echo "[$(date)] ✓ cloudflared service started"
else
  echo "[$(date)] ERROR: cloudflared download failed — tunnel will not be available"
fi

# Disable reverse DNS lookup in sshd — prevents ~60s banner exchange hang
# caused by PTR lookup timeouts when connecting via Cloudflare Tunnel.
echo "UseDNS no" >> /etc/ssh/sshd_config
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
echo "[$(date)] ✓ sshd: UseDNS disabled"

# ============================================================
# PHASE 2+3+4: apt-get, Docker CE, and ttyd download.
# apt-get + Docker CE run in a single background group.
# ttyd is a static binary (only needs curl) and downloads
# in parallel, saving the Docker install time from the
# student-facing critical path.
# ============================================================

TTYD_URL="https://github.com/tsl0922/ttyd/releases/download/1.7.4/ttyd.x86_64"

echo "[$(date)] [PHASE 2] Installing packages + Docker CE (parallel with ttyd download)..."
(
  apt-get update -y
  apt-get install -y --no-install-recommends \
    curl wget git vim nano htop net-tools jq python3 python3-pip gcc \
    ca-certificates gnupg lsb-release
  echo "[$(date)] ✓ Base packages installed"

  # Docker CE — runs after base packages since it needs ca-certificates + gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  usermod -aG docker ubuntu
  echo "[$(date)] ✓ Docker CE installed and running"

  # Pre-pull images most labs need
  echo "[$(date)] [PHASE 4] Pre-pulling Docker images..."
  docker pull nginx:latest       && echo "[$(date)] ✓ nginx:latest"
  docker pull nginx:1.24         && echo "[$(date)] ✓ nginx:1.24"
  docker pull nginx:1.20         && echo "[$(date)] ✓ nginx:1.20"
  docker pull alpine:latest      && echo "[$(date)] ✓ alpine:latest"
  docker pull python:3.11-alpine && echo "[$(date)] ✓ python:3.11-alpine"
  echo "[$(date)] ✓ Image pre-pull complete"
) &
APT_PID=$!

echo "[$(date)] [PHASE 3] Downloading ttyd (parallel with apt-get)..."
TTYD_OK=0
for attempt in 1 2 3; do
  if curl -fsSL --connect-timeout 30 --max-time 120 -o /tmp/ttyd_binary "$TTYD_URL"; then
    SIZE=$(stat -c%s /tmp/ttyd_binary 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 100000 ]; then
      echo "[$(date)] ✓ ttyd downloaded ($SIZE bytes, attempt $attempt)"
      TTYD_OK=1
      break
    fi
  fi
  echo "[$(date)] ttyd download attempt $attempt/3 failed, retrying in 5s..."
  rm -f /tmp/ttyd_binary
  sleep 5
done

# Wait for apt-get before anything that needs installed packages (gcc, scenario deps)
wait $APT_PID
echo "[$(date)] ✓ apt-get complete"

# Install a SUID recovery binary so the worker can restore sudo
# if a student removes its setuid bit during a lab. Shell scripts
# cannot be SUID on Linux — this must be a compiled ELF binary.
cat > /tmp/restore_sudo.c << 'RESTORE_EOF'
#include <unistd.h>
#include <sys/stat.h>
int main(void) {
    chown("/usr/bin/sudo", 0, 0);
    chmod("/usr/bin/sudo", 04755);
    return 0;
}
RESTORE_EOF
gcc -o /usr/local/bin/restore-sudo /tmp/restore_sudo.c
chown root:root /usr/local/bin/restore-sudo
chmod 4755 /usr/local/bin/restore-sudo
rm /tmp/restore_sudo.c
echo "[$(date)] ✓ restore-sudo recovery binary installed"

if [ $TTYD_OK -eq 0 ]; then
  echo "[$(date)] ERROR: Failed to download ttyd after 3 attempts"
  exit 1
fi
mv /tmp/ttyd_binary /usr/local/bin/ttyd
chmod 755 /usr/local/bin/ttyd
echo "[$(date)] ✓ ttyd installed"

# Wrapper script so theme JSON is passed correctly and shell runs as ubuntu
cat > /usr/local/bin/start-ttyd.sh << 'EOF'
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
EOF
chmod +x /usr/local/bin/start-ttyd.sh

cat > /etc/systemd/system/ttyd.service << TTYD_EOF
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
TTYD_EOF

systemctl daemon-reload
systemctl enable ttyd.service
systemctl start ttyd.service

for i in {1..30}; do
  if curl -s http://localhost:7681 > /dev/null 2>&1; then
    echo "[$(date)] ✓ ttyd listening after $i seconds"
    break
  fi
  sleep 1
done

# ============================================================
# PHASE 4: Shell customisation
# ============================================================

cat >> /home/ubuntu/.bashrc << 'EOF'

export PS1='\[\e[38;5;51m\]\u\[\e[0m\]@\[\e[38;5;40m\]\h\[\e[0m\]:\[\e[38;5;226m\]\w\[\e[0m\]\$ '
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias cls='clear'
alias d='docker'
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
EOF
chown ubuntu:ubuntu /home/ubuntu/.bashrc

if ! id student &>/dev/null; then
  useradd -m -s /bin/bash -G docker student
  echo "[$(date)] ✓ student user created"
fi

echo "[$(date)] ========== USERDATA COMPLETE =========="
echo "[$(date)] Node: $NODE_NAME ($NODE_ROLE)"
systemctl status cloudflared.service 2>&1 | grep -E "Active|Loaded" || true
systemctl status docker.service     2>&1 | grep -E "Active|Loaded" || true
systemctl status ttyd.service       2>&1 | grep -E "Active|Loaded" || true
