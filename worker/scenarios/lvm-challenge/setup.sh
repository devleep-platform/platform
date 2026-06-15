#!/bin/bash
# setup.sh — lvm-challenge
set -euo pipefail

apt-get install -y lvm2 >/dev/null 2>&1

# Create two image files simulating physical disks
fallocate -l 2G /opt/disk1.img
fallocate -l 1G /opt/disk2.img

# Attach as loop devices
losetup -D 2>/dev/null || true
losetup /dev/loop10 /opt/disk1.img
losetup /dev/loop11 /opt/disk2.img    # available to extend — not yet in VG

# Create PV and VG using only disk1
pvcreate /dev/loop10 -y
vgcreate datavg /dev/loop10

# Create LV and fill to 90% capacity
lvcreate -L 1800M -n datalv datavg -y
mkfs.ext4 /dev/datavg/datalv >/dev/null 2>&1

mkdir -p /mnt/appdata
echo "/dev/datavg/datalv  /mnt/appdata  ext4  defaults  0 2" >> /etc/fstab
mount /mnt/appdata
chown ubuntu:ubuntu /mnt/appdata

# Fill the LV to 90% with dummy data
dd if=/dev/zero of=/mnt/appdata/existing-data.bin bs=1M count=1620 status=none

# Write errors to a log that the student can find
mkdir -p /var/log
for i in $(seq 1 30); do
  echo "$(date -d "$((31 - i)) seconds ago" '+%Y-%m-%dT%H:%M:%S') ERROR dataprocessor: write /mnt/appdata/batch-$i.dat: no space left on device" \
    >> /var/log/app.log 2>/dev/null || \
  echo "$(date '+%Y-%m-%dT%H:%M:%S') ERROR dataprocessor: write failed: no space left on device" \
    >> /var/log/app.log
done

echo "lvm-challenge ready"
