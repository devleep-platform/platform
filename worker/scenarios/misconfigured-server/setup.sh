#!/bin/bash
# setup.sh — misconfigured-server
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up misconfigured-server scenario"

# 1. World-writable file in /etc with sensitive content
cat > /etc/app-secrets.conf << 'EOF'
# Application secrets — DO NOT COMMIT
DB_PASSWORD=Sup3rS3cret!99
API_KEY=sk-prod-8f3k2p9x1m
EOF
chmod 666 /etc/app-secrets.conf

# 2. Unauthorized SUID binary outside the approved list
cat > /usr/local/bin/debug-tool << 'EOF'
#!/bin/bash
# Internal debug utility — requires root context to read process info
id
whoami
cat /proc/1/environ 2>/dev/null | tr '\0' '\n' | grep -i pass || true
EOF
chmod +x /usr/local/bin/debug-tool
chown root:root /usr/local/bin/debug-tool
chmod u+s /usr/local/bin/debug-tool

# 3. Non-root account with UID 0 (privilege escalation vector)
if ! id ghostadmin >/dev/null 2>&1; then
  useradd -o -u 0 -g 0 -M -s /bin/bash ghostadmin 2>/dev/null || \
    echo "ghostadmin:x:0:0:Ghost Admin:/root:/bin/bash" >> /etc/passwd
fi

# 4. SSH root login enabled
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
grep -q "^PermitRootLogin" /etc/ssh/sshd_config || echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
systemctl reload sshd 2>/dev/null || true

# 5. Root cron job running a world-writable script (LPE via cron)
cat > /usr/local/bin/nightly-cleanup.sh << 'EOF'
#!/bin/bash
# Nightly cleanup — runs as root via cron
find /tmp -mtime +1 -delete 2>/dev/null
echo "Cleanup ran at $(date)" >> /var/log/cleanup.log
EOF
chmod 777 /usr/local/bin/nightly-cleanup.sh
chown root:root /usr/local/bin/nightly-cleanup.sh

(crontab -l 2>/dev/null | grep -v nightly-cleanup || true
 echo "0 2 * * * /usr/local/bin/nightly-cleanup.sh") | crontab -

# Inject scan report into logs for realism
logger -p user.crit "SEC-SCAN: 5 critical findings on $(hostname)" 2>/dev/null || true
logger -p user.crit "SEC-SCAN: [1] world-writable /etc/app-secrets.conf" 2>/dev/null || true
logger -p user.crit "SEC-SCAN: [2] SUID binary /usr/local/bin/debug-tool" 2>/dev/null || true
logger -p user.crit "SEC-SCAN: [3] UID-0 account ghostadmin in /etc/passwd" 2>/dev/null || true
logger -p user.crit "SEC-SCAN: [4] PermitRootLogin yes in sshd_config" 2>/dev/null || true
logger -p user.crit "SEC-SCAN: [5] world-writable cron script /usr/local/bin/nightly-cleanup.sh" 2>/dev/null || true

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] misconfigured-server setup complete"
echo "Findings:"
echo "  /etc/app-secrets.conf: $(stat -c '%a' /etc/app-secrets.conf)"
echo "  debug-tool SUID: $(stat -c '%a' /usr/local/bin/debug-tool)"
echo "  UID-0 accounts: $(awk -F: '$3==0{print $1}' /etc/passwd | tr '\n' ' ')"
echo "  PermitRootLogin: $(sudo sshd -T 2>/dev/null | grep permitrootlogin || echo unknown)"
echo "  nightly-cleanup.sh: $(stat -c '%a' /usr/local/bin/nightly-cleanup.sh)"
