#!/bin/bash
# cleanup.sh — hello-linux
# Restores to clean state — removes anything added by other scenarios

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Cleaning up to hello-linux baseline"

# Restore nginx config if broken
nginx -t 2>/dev/null || {
  cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf 2>/dev/null || \
  apt-get install --reinstall nginx -y -qq 2>/dev/null
}
nginx -t 2>/dev/null && systemctl restart nginx 2>/dev/null || true

# Kill any scenario-injected processes
[[ -f /var/run/cpu-hog.pid ]] && kill $(cat /var/run/cpu-hog.pid) 2>/dev/null && rm -f /var/run/cpu-hog.pid || true
[[ -f /var/run/io-stress.pid ]] && kill $(cat /var/run/io-stress.pid) 2>/dev/null && rm -f /var/run/io-stress.pid || true
[[ -f /var/run/mem-leak.pid ]] && kill $(cat /var/run/mem-leak.pid) 2>/dev/null && rm -f /var/run/mem-leak.pid || true
[[ -f /var/run/perf-cpu.pid ]] && kill $(cat /var/run/perf-cpu.pid) 2>/dev/null && rm -f /var/run/perf-cpu.pid || true
[[ -f /var/run/perf-io.pid ]] && kill $(cat /var/run/perf-io.pid) 2>/dev/null && rm -f /var/run/perf-io.pid || true
[[ -f /var/run/perf-mem.pid ]] && kill $(cat /var/run/perf-mem.pid) 2>/dev/null && rm -f /var/run/perf-mem.pid || true
pkill -f 'cpu-load\|io-load\|cpu_stress\|backup-processor\|dataprocessor' 2>/dev/null || true

# Remove scenario-injected log bloat
rm -f /var/log/large-*.log /var/log/webapp/access.log 2>/dev/null || true
rm -rf /var/log/webapp/ /var/log/application/ /var/junk_data/ 2>/dev/null || true

# Restore permissions on common targets
chmod 644 /etc/nginx/nginx.conf 2>/dev/null || true
chmod 755 /var/www/html/ 2>/dev/null || true
chmod 644 /var/www/html/*.html 2>/dev/null || true
chown -R www-data:www-data /var/www/html/ 2>/dev/null || true

# Clear scenario-specific crontab entries
crontab -l 2>/dev/null | grep -v 'db-backup\|cpu-hog\|health-monitor\|critical-backup\|db-cleanup' | crontab - 2>/dev/null || true

# Disable scenario services
for SVC in dataprocessor incident-cpu filehandler webapp-logger; do
  systemctl stop "$SVC" 2>/dev/null || true
  systemctl disable "$SVC" 2>/dev/null || true
  rm -f "/etc/systemd/system/$SVC.service"
done
systemctl daemon-reload 2>/dev/null || true

echo "Cleanup complete"
