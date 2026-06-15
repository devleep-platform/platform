#!/bin/bash
# setup.sh — exposed-secrets
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up exposed-secrets scenario"

which git >/dev/null 2>&1 || apt-get install -y git -qq 2>/dev/null

# Create the application directory and git repo
mkdir -p /opt/app/{config,src}
chown -R ubuntu:ubuntu /opt/app

sudo -u ubuntu git -C /opt/app init 2>/dev/null
sudo -u ubuntu git -C /opt/app config user.email "dev@lab.internal"
sudo -u ubuntu git -C /opt/app config user.name "Dev Team"

# Commit 1: initial clean setup
sudo -u ubuntu tee /opt/app/config/app.yaml > /dev/null << 'EOF'
server:
  port: 8080
  env: production
logging:
  level: info
  format: json
EOF

sudo -u ubuntu tee /opt/app/src/main.py > /dev/null << 'EOF'
#!/usr/bin/env python3
import os

AWS_KEY = os.environ.get('AWS_ACCESS_KEY_ID')
DB_PASS = os.environ.get('DB_PASSWORD')

print("App starting...")
EOF

sudo -u ubuntu git -C /opt/app add . 2>/dev/null
sudo -u ubuntu git -C /opt/app commit -m "Initial application setup" 2>/dev/null

# Commit 2: accidentally commits credentials (the exposure event)
sudo -u ubuntu tee /opt/app/config/aws.conf > /dev/null << 'EOF'
# AWS credentials — temporary, will remove before merge
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
EOF

sudo -u ubuntu tee /opt/app/config/database.yml > /dev/null << 'EOF'
production:
  adapter: postgresql
  host: db.internal
  database: app_production
  username: webapp
  DB_PASSWORD=Tr0ub4dor&3xample99
  pool: 5
EOF

sudo -u ubuntu git -C /opt/app add . 2>/dev/null
sudo -u ubuntu git -C /opt/app commit -m "Add deployment config" 2>/dev/null

# Commit 3: developer notices and removes the files — but history is permanent
sudo -u ubuntu git -C /opt/app rm config/aws.conf 2>/dev/null
sudo -u ubuntu tee /opt/app/config/database.yml > /dev/null << 'EOF'
production:
  adapter: postgresql
  host: db.internal
  database: app_production
  username: webapp
  password: ${DB_PASSWORD}
  pool: 5
EOF

sudo -u ubuntu git -C /opt/app add . 2>/dev/null
sudo -u ubuntu git -C /opt/app commit -m "Remove hardcoded credentials from config" 2>/dev/null

# Live secrets still on filesystem: .env and deploy.env
sudo -u ubuntu tee /home/ubuntu/.env > /dev/null << 'EOF'
# Local environment — DO NOT COMMIT
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
DB_PASSWORD=Tr0ub4dor&3xample99
STRIPE_SECRET_KEY=sk_live_4eC39HqLyjWDarjtT1zdp7dc
EOF
chmod 644 /home/ubuntu/.env

sudo -u ubuntu tee /opt/app/deploy.env > /dev/null << 'EOF'
# Production deployment variables
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
DB_PASSWORD=Tr0ub4dor&3xample99
EOF

# Security alert log for incident realism
mkdir -p /var/log
tee /var/log/security-alerts.log > /dev/null << 'EOF'
2026-05-01T09:22:14Z CRITICAL GitGuardian: AWS Secret Key detected in commit abc1234 (repo: dev-team/app-backend)
2026-05-01T09:22:15Z CRITICAL GitGuardian: Generic database password detected in commit abc1234
2026-05-01T09:23:01Z WARNING  AWS Security: Potentially exposed access key AKIAIOSFODNN7EXAMPLE detected in public repository
2026-05-01T09:24:00Z CRITICAL Rotate AKIAIOSFODNN7EXAMPLE immediately — key has been public for 48 hours
EOF

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] exposed-secrets setup complete"
echo "Git commits: $(sudo -u ubuntu git -C /opt/app log --oneline 2>/dev/null | wc -l)"
echo "Secret in history: $(sudo -u ubuntu git -C /opt/app log --all -p 2>/dev/null | grep -c 'AKIAIOSFODNN7EXAMPLE' || echo 0) occurrences"
echo "Live files: /home/ubuntu/.env /opt/app/deploy.env"
