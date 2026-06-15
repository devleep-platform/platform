#!/bin/bash
# cleanup.sh — multi-server
for i in 1 2 3; do
  docker rm -f "fleet-node-$i" 2>/dev/null || true
done
rm -f /home/ubuntu/fleet.txt /home/ubuntu/.ssh/fleet_key /home/ubuntu/.ssh/fleet_key.pub
# Remove fleet SSH config blocks
python3 - << 'PYEOF' 2>/dev/null || true
import re, os
p = '/home/ubuntu/.ssh/config'
if not os.path.exists(p):
    exit(0)
with open(p) as f:
    content = f.read()
# Remove Host web-[123] blocks
content = re.sub(r'\nHost web-[123]\b.*?(?=\nHost |\Z)', '', content, flags=re.DOTALL)
with open(p, 'w') as f:
    f.write(content)
PYEOF
echo "multi-server cleanup complete"
