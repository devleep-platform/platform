#!/bin/bash
# cleanup.sh — route-broken
ip route del blackhole 192.168.100.0/24 2>/dev/null || true
ip route del 192.168.100.0/24 2>/dev/null || true
pkill -f internal-api 2>/dev/null || true
pkill -f app-connector 2>/dev/null || true
rm -f /usr/local/bin/internal-api /usr/local/bin/app-connector
# Remove route from any netplan/interfaces file if student added it
grep -rl '192.168.100' /etc/netplan/ 2>/dev/null | xargs sed -i '/192.168.100/d' 2>/dev/null || true
echo "route-broken cleanup complete"
