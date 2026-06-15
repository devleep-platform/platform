#!/bin/bash
# cleanup.sh — disk-full

# Kill the logger process
[[ -f /var/run/webapp-logger.pid ]] && \
  kill $(cat /var/run/webapp-logger.pid) 2>/dev/null && \
  rm -f /var/run/webapp-logger.pid || true

pkill -f webapp-logger.sh 2>/dev/null || true

# Remove the large files
rm -f /var/log/webapp/access.log* \
      /var/log/webapp/error.log* \
      /var/log/webapp/*.gz 2>/dev/null || true

rm -f /usr/local/bin/webapp-logger.sh

echo "Disk cleanup complete. Current usage: $(df -h / | awk 'NR==2{print $5}')"
