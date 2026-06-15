#!/bin/bash
# cleanup.sh — ssh-lab
docker rm -f ssh-target 2>/dev/null || true
userdel -r labuser 2>/dev/null || true
# Restore sshd password auth to default (no)
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config 2>/dev/null || true
systemctl reload sshd 2>/dev/null || true
echo "ssh-lab cleanup complete"
