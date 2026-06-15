#!/bin/bash
# setup.sh — performance-degraded
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up performance-degraded scenario"

# ── CPU load ──────────────────────────────────────────────────
cat > /usr/local/bin/cpu-load.sh << 'CPU'
#!/bin/bash
# Simulates a calculation-heavy process (like data analysis or encoding)
while true; do
  openssl speed sha256 > /dev/null 2>&1 || \
  python3 -c "sum(range(10000000))" > /dev/null 2>&1 || \
  for i in $(seq 1 50000); do echo $i > /dev/null; done
done
CPU
chmod +x /usr/local/bin/cpu-load.sh
nohup /usr/local/bin/cpu-load.sh > /dev/null 2>&1 &
echo $! > /var/run/perf-cpu.pid

# ── I/O load ─────────────────────────────────────────────────
cat > /usr/local/bin/io-load.sh << 'IO'
#!/bin/bash
# Simulates a process doing unoptimised disk writes
while true; do
  dd if=/dev/urandom of=/tmp/io-load-tmp bs=4k count=256 2>/dev/null
  sync
  rm -f /tmp/io-load-tmp
done
IO
chmod +x /usr/local/bin/io-load.sh
nohup /usr/local/bin/io-load.sh > /dev/null 2>&1 &
echo $! > /var/run/perf-io.pid

# ── Memory leak ───────────────────────────────────────────────
python3 -c "
import time, sys

data = []
print('Memory leak process starting...', flush=True)

while True:
    # Allocate 1MB every 2 seconds, cap at 150MB to avoid OOM
    chunk = bytearray(1024 * 1024)
    data.append(chunk)
    if len(data) > 150:
        data.pop(0)  # drop oldest to maintain plateau
    time.sleep(2)
" > /var/log/mem-leak.log 2>&1 &
echo $! > /var/run/perf-mem.pid

# Wait for processes to start and load to build
sleep 5

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] performance-degraded setup complete"
echo "CPU load process PID: $(cat /var/run/perf-cpu.pid)"
echo "I/O load process PID: $(cat /var/run/perf-io.pid)"
echo "Memory load process PID: $(cat /var/run/perf-mem.pid)"
echo "Load average: $(cat /proc/loadavg | awk '{print $1,$2,$3}')"
