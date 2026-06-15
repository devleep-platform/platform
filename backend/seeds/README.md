# Lab Definitions Seed Guide

## Prerequisites

You need your Neon database connection string. Format:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

Example from your setup:
```
postgresql://[user]:[password]@ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech/devops_lab?sslmode=require
```

## Option 1: Using TypeScript Seed Script (Recommended)

### Setup
```bash
cd backend

# Install dependencies if needed
npm install

# Set environment variable with your Neon connection string
$env:DATABASE_URL = "postgresql://user:password@ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech/devops_lab?sslmode=require"

# Run seed script
npm run seed
# or manually:
ts-node seeds/labs.seed.ts
```

### Features
- ✅ Idempotent (safe to run multiple times)
- ✅ Automatic SSL support for Neon
- ✅ Transaction with rollback on error
- ✅ Clear progress output

## Option 2: Using SQL Seed Script

### Setup
```bash
# Set up environment for psql
$env:PGPASSWORD = "your-password"

# Run SQL seed
psql -h ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech `
     -U [user] `
     -d devops_lab `
     -f backend/seeds/labs.seed.sql `
     --set sslmode=require
```

### On Windows PowerShell
```powershell
$env:PGPASSWORD = "your-neon-password"
$connectionString = "postgresql://user:password@ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech/devops_lab?sslmode=require"

# Then run with psql (if installed)
psql -h ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech -U [user] -d devops_lab -f backend/seeds/labs.seed.sql
```

## Verification

After seeding, verify the labs were inserted:

### Option A: Using SQL
```sql
SELECT slug, title, difficulty, published 
FROM lab_definitions 
WHERE terraform_module = 'labs/linux-ec2' 
ORDER BY slug;
```

### Option B: Using Node.js
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) as total_labs FROM lab_definitions WHERE terraform_module = 'labs/linux-ec2';"
```

Expected output:
- **25 total labs** seeded
- 8 beginner
- 9 intermediate  
- 8 advanced

## Troubleshooting

### Issue: "SSL required" error
**Solution**: Ensure your connection string includes `?sslmode=require` or add `--set sslmode=require` flag

### Issue: "Connection refused"
**Solution**: Verify your Neon host is correct. Check in your Neon dashboard for the exact connection string.

### Issue: "Database does not exist"
**Solution**: Ensure the database `devops_lab` exists in your Neon project. Create if needed.

### Issue: "Table lab_definitions does not exist"
**Solution**: Run database migrations first:
```bash
# From backend directory
npm run migrate
# or manually run SQL from database schema file
```

## Lab Content Details

The seed includes:
- **linux-101 to 108**: Beginner Linux fundamentals (shell, files, permissions, etc.)
- **linux-109 to 117**: Intermediate skills (bash scripting, services, troubleshooting)
- **linux-118 to 125**: Advanced incident response scenarios
  - **linux-118-incident-web-service-down** uses `scenario_id: "broken-nginx"`
  - This lab automatically triggers the broken-nginx scenario during provisioning

## Next Steps

1. ✅ Seed labs to database
2. Start backend server (Fastify)
3. Start frontend (npm run dev)
4. Create test user and login
5. Navigate to `/labs/linux-101-shell-and-fs` to test

The platform will now fetch lab definitions from the database and display them in the UI.
