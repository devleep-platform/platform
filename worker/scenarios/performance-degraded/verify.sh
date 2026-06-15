#!/bin/bash
# verify.sh — performance-degraded
set -euo pipefail
ERRORS=0

# Wait for load to build
sleep 5

LOAD=$(cat /proc/loadavg | awk '{print $1}' | cut -d. -f1)
if [[ ${LOAD:-0} -ge 1 ]]; then
  echo "PASS: elevated load average ($(cat /proc/loadavg | awk '{print $1}'))"
else
  echo "WARN: load average low ($(cat /proc/loadavg | awk '{print $1}')) — may still be ramping"
fi

for PID_FILE in /var/run/perf-cpu.pid /var/run/perf-io.pid /var/run/perf-mem.pid; do
  if [[ -f "$PID_FILE" ]] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
    echo "PASS: process $(basename $PID_FILE .pid) is running"
  else
    echo "FAIL: process $(basename $PID_FILE .pid) not running"
    ERRORS=$((ERRORS + 1))
  fi
done

[[ $ERRORS -eq 0 ]] && echo "scenario verify: PASS" || { echo "scenario verify: FAIL"; exit 1; }
