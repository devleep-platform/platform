#!/usr/bin/env pwsh

# Lab Definitions Seed Script for Neon Database
# Usage: .\backend\seeds\seed-labs.ps1

param(
    [string]$ConnectionString,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Lab Definitions Seed Script for Neon
=====================================

Usage: .\backend\seeds\seed-labs.ps1 -ConnectionString "postgresql://user:password@host/dbname"

Environment Variable Alternative:
Set `$env:DATABASE_URL before running this script

Example:
  `$env:DATABASE_URL = "postgresql://user:password@ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech/devops_lab?sslmode=require"
  .\backend\seeds\seed-labs.ps1

Your Neon Connection:
  Host: ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech
  Database: devops_lab
  Format: postgresql://[user]:[password]@[host]/[database]?sslmode=require

"@
    exit 0
}

# Use parameter or environment variable
$dbUrl = $ConnectionString -or $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "❌ ERROR: No database connection string provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Set your Neon connection string:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql://user:password@ep-calm-heart-apdxwlxx-pooler.c-7.us-east-1.aws.neon.tech/devops_lab?sslmode=require"'
    Write-Host ""
    Write-Host "Then run: .\backend\seeds\seed-labs.ps1"
    Write-Host ""
    Write-Host "Or pass directly: .\backend\seeds\seed-labs.ps1 -ConnectionString `"postgresql://...`""
    exit 1
}

Write-Host "🌱 Seeding Lab Definitions from Neon..." -ForegroundColor Green
Write-Host "📍 Connection: $($dbUrl -replace ':[^@]*@', ':***@')" -ForegroundColor Cyan
Write-Host ""

# Use Node.js seed script
$env:DATABASE_URL = $dbUrl

# Check if ts-node is available, otherwise use node with compiled JS
if (Get-Command ts-node -ErrorAction SilentlyContinue) {
    Write-Host "▶️  Running: ts-node backend/seeds/labs.seed.ts"
    ts-node backend/seeds/labs.seed.ts
} else {
    Write-Host "⚠️  ts-node not found, trying npx..." -ForegroundColor Yellow
    npx ts-node backend/seeds/labs.seed.ts
}

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ Lab definitions seeded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verify with:"
    Write-Host "  SELECT COUNT(*) FROM lab_definitions WHERE terraform_module = 'labs/linux-ec2';"
    Write-Host ""
    Write-Host "Expected: 25 labs total"
} else {
    Write-Host ""
    Write-Host "❌ Seeding failed with exit code $exitCode" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:"
    Write-Host "  1. Verify DATABASE_URL is correct"
    Write-Host "  2. Check Neon connection in dashboard"
    Write-Host "  3. Ensure lab_definitions table exists (run migrations first)"
    Write-Host "  4. Check SSL connection with: ?sslmode=require in connection string"
}

exit $exitCode
