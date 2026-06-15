#!/bin/bash
# setup.sh — log-injection
set -euo pipefail
exec >> /var/log/scenario-setup.log 2>&1
echo "[$(date '+%Y-%m-%dT%H:%M:%S')] Setting up log-injection scenario"

mkdir -p /var/log
touch /var/log/auth.log /var/log/app.log

# ── Attacker IPs ──────────────────────────────────────────────
ATTACKER_1="185.234.218.42"    # brute force — many failures
ATTACKER_2="45.142.212.100"    # second scanner
ATTACKER_3="103.75.186.49"     # third scanner
LEGITIMATE_IP="10.0.0.5"       # real admin
COMPROMISED_IP="192.168.44.78" # the IP that succeeded and did damage

python3 << 'PYEOF'
import random
import datetime

auth_log = open('/var/log/auth.log', 'a')
app_log  = open('/var/log/app.log',  'a')
hostname = open('/etc/hostname').read().strip()

def auth_ts(minutes_ago):
    t = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes_ago)
    return t.strftime('%b %d %H:%M:%S')

def app_ts(minutes_ago):
    t = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes_ago)
    return t.isoformat(timespec='seconds')

# 120-90 min ago: Background normal traffic
for i in range(60, 0, -1):
    ma = 120 - i
    auth_log.write(f"{auth_ts(ma)} {hostname} sshd[1234]: Failed password for invalid user admin from 10.20.30.{i%50+1} port {random.randint(40000,60000)} ssh2\n")

# 90 min ago: Brute force begins from ATTACKER_1
for i in range(60, 0, -1):
    ma = 90 - i
    user = random.choice(['root', 'admin', 'ubuntu', 'user', 'pi'])
    auth_log.write(f"{auth_ts(ma)} {hostname} sshd[2341]: Failed password for {user} from 185.234.218.42 port {random.randint(40000,60000)} ssh2\n")

# 88 min ago: ATTACKER_2 joins
for i in range(30, 0, -1):
    ma = 88 - i
    auth_log.write(f"{auth_ts(ma)} {hostname} sshd[2342]: Failed password for root from 45.142.212.100 port {random.randint(40000,60000)} ssh2\n")

# 75 min ago: App starts seeing errors (maybe attacker scanning web too)
for i in range(30, 0, -1):
    ma = 75 - i
    app_log.write(f"{app_ts(ma)} WARN  api: unusual request pattern from 185.234.218.42: 40 req/s\n")
    if i % 5 == 0:
        app_log.write(f"{app_ts(ma)} ERROR api: rate limit exceeded for 185.234.218.42\n")

# 60 min ago: Successful login from COMPROMISED IP (attacker gets in)
auth_log.write(f"{auth_ts(60)} {hostname} sshd[2350]: Accepted password for ubuntu from 192.168.44.78 port 52234 ssh2\n")
auth_log.write(f"{auth_ts(60)} {hostname} sshd[2350]: pam_unix(sshd:session): session opened for user ubuntu by (uid=0)\n")

# 59-50 min ago: Post-compromise activity visible in logs
for i in range(9, 0, -1):
    ma = 59 - i
    app_log.write(f"{app_ts(ma)} ERROR database: unusual query from session 192.168.44.78: SELECT * FROM users LIMIT 10000\n")

auth_log.write(f"{auth_ts(55)} {hostname} sudo[2400]: ubuntu : TTY=pts/0 ; PWD=/home/ubuntu ; USER=root ; COMMAND=/bin/cat /etc/shadow\n")
auth_log.write(f"{auth_ts(54)} {hostname} sudo[2401]: ubuntu : TTY=pts/0 ; PWD=/home/ubuntu ; USER=root ; COMMAND=/bin/cp /etc/passwd /tmp/pw\n")

# 50 min ago: Admin notices and logs in
auth_log.write(f"{auth_ts(50)} {hostname} sshd[2500]: Accepted publickey for ubuntu from 10.0.0.5 port 52843 ssh2\n")

# 45-30 min ago: Attacker still trying despite detection
for i in range(15, 0, -1):
    ma = 45 - i
    auth_log.write(f"{auth_ts(ma)} {hostname} sshd[2600]: Failed password for root from 103.75.186.49 port {random.randint(40000,60000)} ssh2\n")

# Recent: Normal operations
for i in range(20, 0, -1):
    ma = 20 - i
    app_log.write(f"{app_ts(ma)} INFO  api: GET /api/health 200 5ms\n")

auth_log.close()
app_log.close()
PYEOF

echo "[$(date '+%Y-%m-%dT%H:%M:%S')] log-injection setup complete"
echo "Auth log size: $(wc -l < /var/log/auth.log) lines"
echo "App log size:  $(wc -l < /var/log/app.log) lines"
