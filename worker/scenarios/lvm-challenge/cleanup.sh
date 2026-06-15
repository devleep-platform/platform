#!/bin/bash
# cleanup.sh — lvm-challenge
umount /mnt/appdata 2>/dev/null || true
lvremove -f /dev/datavg/datalv 2>/dev/null || true
vgremove -f datavg 2>/dev/null || true
pvremove /dev/loop10 /dev/loop11 2>/dev/null || true
losetup -d /dev/loop10 /dev/loop11 2>/dev/null || true
rm -f /opt/disk1.img /opt/disk2.img
sed -i '/datavg/d' /etc/fstab
echo "lvm-challenge cleanup complete"
