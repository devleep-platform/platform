#!/bin/bash
# setup.sh — oom-killer
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up oom-killer scenario"

# Create a persistent application process (pgrep myapp must return a PID)
cat > /usr/local/bin/myapp << 'APPEOF'
#!/bin/bash
# myapp — long-running application service
mkdir -p /var/log
exec > /var/log/myapp.log 2>&1
echo "myapp started PID=$$"
echo "Working set allocated. Listening on port 8080."
exec sleep infinity
APPEOF
chmod +x /usr/local/bin/myapp

# Secondary process to simulate mysql sharing the box
cat > /usr/local/bin/mysql-sim << 'SIMEOF'
#!/bin/bash
exec sleep infinity
SIMEOF
chmod +x /usr/local/bin/mysql-sim

cat > /etc/systemd/system/myapp.service << 'UNITEOF'
[Unit]
Description=Application Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/myapp
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNITEOF

cat > /etc/systemd/system/mysql-sim.service << 'UNITEOF'
[Unit]
Description=MySQL Database Server (simulated)
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mysql-sim
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable --now myapp.service 2>/dev/null || true
systemctl enable --now mysql-sim.service 2>/dev/null || true
sleep 2

# Inject historical OOM kill events into kern.log
mkdir -p /var/log
touch /var/log/kern.log

for offset in 3600 60; do
  TS=$(date -d "$offset seconds ago" '+%b %d %H:%M:%S' 2>/dev/null || date '+%b %d %H:%M:%S')
  KILLED_PID=$(( 4821 + offset ))
  cat >> /var/log/kern.log << EOF
$TS $(hostname) kernel: [1234567.890] oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),cpuset=/,mems_allowed=0,global_oom,task_memcg=/system.slice/myapp.service,task=myapp,pid=$KILLED_PID,uid=0
$TS $(hostname) kernel: [1234567.891] Out of memory: Killed process $KILLED_PID (myapp) total-vm:987648kB, anon-rss:891234kB, file-rss:0kB, shmem-rss:0kB, UID:0 pgtables:1924kB oom_score_adj:0
$TS $(hostname) kernel: [1234567.892] oom_reaper: reaped process $KILLED_PID (myapp), now anon-rss:0kB, file-rss:0kB, shmem-rss:0kB
EOF
done

# Ensure no swap is active (student must add it)
swapoff -a 2>/dev/null || true

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] oom-killer setup complete"
echo "myapp PID: $(pgrep myapp 2>/dev/null | head -1 || echo 'not found')"
echo "Swap: $(swapon -s 2>/dev/null | grep -c 'Filename' || echo '0') active entries"
echo "OOM events in kern.log: $(grep -c 'Out of memory.*myapp' /var/log/kern.log 2>/dev/null || echo 0)"
