-- Lab Definitions Seed Script
-- This script inserts all 25 Linux labs into the lab_definitions table
-- Usage: psql -U postgres -d devops_lab -f backend/seeds/labs.seed.sql

INSERT INTO lab_definitions (id, slug, title, description, difficulty, terraform_module, scenario_id, estimated_minutes, timeout_minutes, published, outputs_mapping, content, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'linux-101-shell-and-fs', 'Intro to the Shell and Filesystem', 'Log in, use the terminal, and navigate the Linux directory tree.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Log in to a Linux instance using the integrated terminal.", "Use basic shell commands to inspect the current directory.", "Understand absolute vs relative paths in the filesystem."], "steps": [{"id": "whoami-and-pwd", "order": 1, "title": "Confirm your user and current directory", "instructions": "1. In the terminal below, run:\n   whoami\n   pwd\n2. Observe the username and the absolute path of your current directory.", "hint": "The command `pwd` prints the full path of your current working directory.", "validation": {"id": "whoami-pwd-ran", "type": "ssh_command", "command": "whoami && pwd", "expected_contains": "/home", "timeout_seconds": 10, "failure_hint": "Make sure you ran both `whoami` and `pwd` in the terminal. You should be in some directory under /home."}}]}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-102-files-and-dirs', 'Working with Files and Directories', 'Create, move, copy, and remove files and directories safely.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Create new directories and files from the command line.", "Move, copy, and remove files safely.", "Use wildcards to work with multiple files."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-103-view-and-edit', 'Viewing and Editing Text Files', 'Use cat, less, head, tail and a terminal editor to inspect and modify files.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["View text files using common command line tools.", "Use a terminal editor (nano or vim) to modify a file.", "Inspect the beginning and end of log-like files."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-104-pipes-and-redirects', 'Power of Pipes and Redirection', 'Combine commands with pipes and redirection to process text streams.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Use redirection operators to send command output into files.", "Use pipes to connect multiple commands together.", "Combine grep, sort, and uniq to build simple one-liners."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-105-users-and-groups', 'Users, Groups, and sudo Basics', 'Understand users, groups, and basic sudo usage.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Inspect your current user and group memberships.", "View system account information from /etc/passwd and /etc/group.", "Use sudo to run privileged commands."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-106-file-permissions', 'File Permissions 101', 'Interpret and change file permissions and ownership.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Read permission bits from ls -l output.", "Modify permissions using chmod.", "Change ownership using chown."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-107-processes-and-jobs', 'Processes and Job Control', 'List and manage processes and foreground/background jobs.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["List processes and understand basic resource usage.", "Start a long-running process and manage it in the background.", "Send signals to terminate processes."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-108-packages-and-system-info', 'Package Management and System Info', 'Install packages and gather basic system information on Ubuntu 22.04.', 'beginner', 'labs/linux-ec2', NULL, 25, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Gather OS and kernel information from the system.", "Use APT to search for and install software.", "Verify disk and memory usage."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-109-bash-scripting-fundamentals', 'Bash Scripting Fundamentals', 'Write your first Bash scripts with shebang, variables, and arguments.', 'intermediate', 'labs/linux-ec2', NULL, 30, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Create a Bash script with a proper shebang line.", "Make a script executable and run it from the command line.", "Use positional arguments inside a script."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-110-bash-conditions-loops', 'Conditions and Loops in Bash', 'Use if/else, case, and loops to build decision-making scripts.', 'intermediate', 'labs/linux-ec2', NULL, 35, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Use if/elif/else to branch on conditions in Bash.", "Write loops to iterate over ranges and lists.", "Handle different user inputs with case statements."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-111-bash-functions-exit-codes', 'Functions, Exit Codes, and Error Handling', 'Structure scripts with functions and handle errors via exit codes.', 'intermediate', 'labs/linux-ec2', NULL, 35, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Create and call functions from Bash scripts.", "Use exit codes to signal success and failure.", "Implement basic argument validation and usage messages."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-112-bash-files-and-text', 'Working with Files in Scripts', 'Read and process files in scripts using grep, awk, and loops.', 'intermediate', 'labs/linux-ec2', NULL, 35, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Read from files and standard input inside Bash scripts.", "Use grep and simple commands in scripts to analyze text data.", "Produce simple summary reports from log-like files."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-113-cron-and-scheduled-tasks', 'Scheduling Tasks with cron', 'Create and debug scheduled jobs using cron on Ubuntu.', 'intermediate', 'labs/linux-ec2', NULL, 30, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Create user crontab entries to run commands on a schedule.", "Verify scheduled jobs by inspecting logs or outputs.", "Debug common cron issues related to environment and paths."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-114-systemd-service-basics', 'Managing Services with systemd', 'Start, stop, enable, and inspect services with systemd on Ubuntu 22.04.', 'intermediate', 'labs/linux-ec2', NULL, 30, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Check the status of systemd services.", "Start, stop, and restart services using systemctl.", "Enable services to start automatically on boot."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-115-disks-and-df-du', 'Disks, Filesystems, and Disk Usage', 'Use lsblk, df, and du to understand disk layout and usage.', 'intermediate', 'labs/linux-ec2', NULL, 30, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Inspect disks and partitions with lsblk.", "Check filesystem usage with df -h.", "Identify large directories using du."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-116-log-files-and-troubleshooting', 'Log Files and Basic Troubleshooting', 'Explore system and application logs and extract useful information.', 'intermediate', 'labs/linux-ec2', NULL, 30, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Locate common log files on Ubuntu.", "Use grep and tail to inspect logs.", "Relate log entries to system behavior."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-117-networking-basics', 'Networking Basics and Connectivity Checks', 'Inspect network configuration and debug simple connectivity issues.', 'intermediate', 'labs/linux-ec2', NULL, 30, 60, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["View IP addresses and routes on a Linux server.", "Use ping and curl to test connectivity.", "Inspect basic DNS resolution."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-118-incident-web-service-down', 'Incident: Web Service Down (Nginx)', 'Diagnose and fix a failed nginx service using logs and config validation.', 'advanced', 'labs/linux-ec2', 'broken-nginx', 40, 90, false, '{"SERVER_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Investigate a failed web service using systemd and logs.", "Validate nginx configuration and fix syntax errors.", "Confirm the service responds with HTTP 200 on port 80."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-119-incident-disk-full', 'Incident: Disk Full on /var', 'Investigate and resolve a disk-full incident affecting the /var filesystem.', 'advanced', 'labs/linux-ec2', NULL, 40, 90, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Detect a disk full condition using df and du.", "Identify the directories and files consuming space under /var.", "Clean up safely and restore sufficient free space."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-120-incident-permission-chaos', 'Incident: Permission Chaos in a Web App', 'Fix a broken application caused by incorrect file permissions and ownership.', 'advanced', 'labs/linux-ec2', NULL, 40, 90, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Diagnose a failing application due to permissions issues.", "Correct ownership and permissions on application directories.", "Verify the service starts and stays healthy."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-121-incident-high-cpu-memory', 'Incident: High CPU or Memory Usage', 'Identify and remediate runaway processes causing resource pressure.', 'advanced', 'labs/linux-ec2', NULL, 40, 90, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Use top or htop to identify high CPU and memory consumers.", "Locate the underlying process and its command.", "Terminate or adjust the process to restore healthy resource usage."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-122-script-log-parser', 'Build a Log Parsing and Alert Script', 'Write a Bash script that scans log files for error patterns and reports counts.', 'advanced', 'labs/linux-ec2', NULL, 40, 90, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Parse log files using grep and simple Bash constructs.", "Count occurrences of error patterns over a file.", "Exit non-zero when error counts exceed a threshold."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-123-script-health-check', 'Build a Service Health Check Script', 'Create a script that checks process, port, and HTTP endpoint health.', 'advanced', 'labs/linux-ec2', NULL, 40, 90, false, '{"SERVER_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Check service status programmatically using systemctl and curl.", "Return different exit codes based on health.", "Print a concise status summary suitable for monitoring."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-124-backup-and-restore-script', 'Automated Backup and Restore with tar', 'Implement a simple backup and restore script using tar and timestamps.', 'advanced', 'labs/linux-ec2', NULL, 40, 90, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Create compressed backups using tar.", "Use timestamps in filenames for rotation.", "Perform a simple restore from a backup archive."], "steps": []}'::jsonb, NOW(), NOW()),
  
  (gen_random_uuid(), 'linux-125-capstone-oncall-multi-incident', 'Capstone: Multi-Issue On-Call Scenario', 'Troubleshoot a realistic outage combining disk, permissions, and service issues.', 'advanced', 'labs/linux-ec2', NULL, 60, 120, false, '{"EC2_IP": "ec2_private_ip"}'::jsonb, '{"objectives": ["Apply Linux and scripting skills to diagnose a multi-symptom incident.", "Prioritize and fix multiple issues affecting a service.", "Verify the system is healthy end-to-end."], "steps": []}'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  difficulty = EXCLUDED.difficulty,
  terraform_module = EXCLUDED.terraform_module,
  scenario_id = EXCLUDED.scenario_id,
  estimated_minutes = EXCLUDED.estimated_minutes,
  timeout_minutes = EXCLUDED.timeout_minutes,
  outputs_mapping = EXCLUDED.outputs_mapping,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Verification query
SELECT slug, title, difficulty FROM lab_definitions WHERE terraform_module = 'labs/linux-ec2' ORDER BY slug;
