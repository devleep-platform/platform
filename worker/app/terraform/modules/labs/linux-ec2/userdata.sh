#!/bin/bash
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

export NODE_NAME="${node_name}"
export NODE_ROLE="${node_role}"
export CF_TUNNEL_TOKEN="${cf_tunnel_token}"
export SESSION_TOKEN="${session_token}"

echo "[$(date)] Starting lab session setup (node: $NODE_NAME)..."

if [ -z "$CF_TUNNEL_TOKEN" ]; then
  echo "[$(date)] ERROR: CF_TUNNEL_TOKEN is EMPTY!"
  exit 1
fi
if [ -z "$SESSION_TOKEN" ]; then
  echo "[$(date)] ERROR: SESSION_TOKEN is EMPTY!"
  exit 1
fi

# ============================================================
# SSH authorized key — must run first
# ============================================================
mkdir -p /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
echo "${ssh_public_key}" >> /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
echo "[$(date)] ✓ SSH authorized key installed"

# ============================================================
# cloudflared service install + start
# Binary is pre-installed on the AMI; only the per-session token is new.
# ============================================================
/usr/local/bin/cloudflared service install "$CF_TUNNEL_TOKEN"
systemctl start cloudflared.service
echo "[$(date)] ✓ cloudflared service started"

# ============================================================
# ttyd service enable + start
# Binary and unit file are pre-installed on the AMI.
# ============================================================
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

echo "[$(date)] ========== USERDATA COMPLETE =========="
echo "[$(date)] Node: $NODE_NAME ($NODE_ROLE)"
systemctl status cloudflared.service 2>&1 | grep -E "Active|Loaded" || true
systemctl status docker.service       2>&1 | grep -E "Active|Loaded" || true
systemctl status ttyd.service         2>&1 | grep -E "Active|Loaded" || true
