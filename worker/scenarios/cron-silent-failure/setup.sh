#!/bin/bash
# setup.sh — cron-silent-failure
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up cron-silent-failure scenario"

# Create the source data that the backup script should back up
mkdir -p /opt/myapp/data
echo "production data" > /opt/myapp/data/database.dump
mkdir -p /opt/myapp/conf
echo "config data" > /opt/myapp/conf/settings.conf 2>/dev/null || true

# ── The backup script — looks correct but has hidden failures ──
cat > /usr/local/bin/db-backup.sh << 'SCRIPT'
#!/bin/bash
# Database backup script
# Runs at: */5 * * * *

BACKUP_DIR=/opt/backups/db
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SOURCE=/opt/myapp/data

# Issue 1: BACKUP_DIR does not exist — script never created it
# This will silently fail with 'No such file or directory'
cp -r "$SOURCE/"* "$BACKUP_DIR/"

# Issue 2: Uses 'python3' to generate the manifest
# python3 is not in cron's default PATH on some systems
python3 -c "
import os, json, datetime
files = os.listdir('$BACKUP_DIR')
manifest = {'timestamp': datetime.datetime.now().isoformat(), 'files': files}
print(json.dumps(manifest, indent=2))
" > "$BACKUP_DIR/manifest-${TIMESTAMP}.json"

echo "Backup complete: $BACKUP_DIR ($TIMESTAMP)"
SCRIPT
chmod +x /usr/local/bin/db-backup.sh

# Verify: script works when run manually with proper environment
/usr/local/bin/db-backup.sh 2>/dev/null || true

# Clean up so it's clearly broken
rm -rf /opt/backups/

# Add cron job WITHOUT output redirection — errors vanish
(crontab -l 2>/dev/null | grep -v db-backup || true
 echo "*/5 * * * * /usr/local/bin/db-backup.sh") | crontab -

# Add a second cron job that also fails — tests broader understanding
cat > /usr/local/bin/health-monitor.sh << 'MON'
#!/bin/bash
# Uses health-check.sh which is in /usr/local/bin — not in cron's PATH
health-check.sh >> /var/log/health-status.log 2>&1
echo "$(date): monitoring complete" >> /var/log/health-status.log
MON
chmod +x /usr/local/bin/health-monitor.sh

(crontab -l 2>/dev/null
 echo "*/10 * * * * /usr/local/bin/health-monitor.sh") | crontab -

# Add a WORKING cron job so students can see what success looks like
(crontab -l 2>/dev/null
 echo "*/15 * * * * /bin/date >> /tmp/cron-working.txt") | crontab -

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] cron-silent-failure setup complete"
echo "Current crontab:"
crontab -l
