#!/bin/bash
# cleanup.sh — performance-degraded

for PIDFILE in /var/run/perf-cpu.pid /var/run/perf-io.pid /var/run/perf-mem.pid; do
  [[ -f "$PIDFILE" ]] && {
    kill $(cat "$PIDFILE") 2>/dev/null || true
    rm -f "$PIDFILE"
  }
done

pkill -f 'cpu-load\|io-load' 2>/dev/null || true
rm -f /tmp/io-load-tmp /var/log/mem-leak.log
rm -f /usr/local/bin/cpu-load.sh /usr/local/bin/io-load.sh

sleep 2
echo "performance-degraded cleanup complete. Load: $(uptime | grep -oP 'load average: .+')"
