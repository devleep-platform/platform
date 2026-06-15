#!/bin/bash
# cleanup.sh — cert-expired
rm -f /etc/nginx/ssl/server.crt /etc/nginx/ssl/server.key \
      /etc/nginx/ssl/server.crt.new /etc/nginx/ssl/server.key.new \
      /etc/nginx/ssl/server.crt.backup* /etc/nginx/ssl/server.key.backup*
rm -f /var/log/cert-monitor.log /tmp/cert-diagnosis.txt /tmp/cert.conf /tmp/server.csr
rm -f /usr/local/bin/cert-check.sh
crontab -l 2>/dev/null | grep -v cert-check | crontab - 2>/dev/null || true
systemctl reload nginx 2>/dev/null || true
echo "cert-expired cleanup complete"
