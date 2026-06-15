#!/bin/bash
# cleanup.sh — cron-silent-failure

crontab -l 2>/dev/null | \
  grep -v 'db-backup\|health-monitor' | \
  crontab - 2>/dev/null || true

rm -f /usr/local/bin/db-backup.sh \
      /usr/local/bin/health-monitor.sh
rm -rf /opt/backups/
echo "cron-silent-failure cleanup complete"
