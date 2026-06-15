#!/bin/bash
# cleanup.sh — oom-killer

systemctl stop myapp.service mysql-sim.service 2>/dev/null || true
systemctl disable myapp.service mysql-sim.service 2>/dev/null || true
rm -f /etc/systemd/system/myapp.service \
      /etc/systemd/system/mysql-sim.service \
      /usr/local/bin/myapp \
      /usr/local/bin/mysql-sim \
      /var/log/myapp.log
systemctl daemon-reload 2>/dev/null || true

swapoff /swapfile 2>/dev/null || true
rm -f /swapfile
sed -i '/swapfile/d' /etc/fstab 2>/dev/null || true

rm -f /etc/sysctl.d/99-memory-tuning.conf 2>/dev/null || true

grep -v "oom-kill\|Out of memory\|oom_reaper" /var/log/kern.log \
  > /tmp/kern-clean.log 2>/dev/null && \
  mv /tmp/kern-clean.log /var/log/kern.log 2>/dev/null || true

echo "oom-killer cleanup complete"
