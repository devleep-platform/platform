#!/bin/bash
# cleanup.sh — permission-chaos

# Restore correct permissions
chown -R www-data:www-data /var/www/webapp/ 2>/dev/null || true
chmod -R 755 /var/www/webapp/ 2>/dev/null || true
chmod 644 /var/www/webapp/static/*.css 2>/dev/null || true
chmod 750 /var/www/webapp/uploads/ 2>/dev/null || true
chown www-data:www-data /var/www/webapp/uploads/ 2>/dev/null || true

chown www-data:adm /var/log/nginx/ 2>/dev/null || true
chmod 755 /var/log/nginx/ 2>/dev/null || true

chown root:webapp /opt/webapp/conf/database.conf 2>/dev/null || true
chmod 640 /opt/webapp/conf/database.conf 2>/dev/null || true

nginx -t 2>/dev/null && systemctl restart nginx 2>/dev/null || true
echo "permission-chaos cleanup complete"
