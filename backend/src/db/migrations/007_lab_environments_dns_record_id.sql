-- 007_lab_environments_dns_record_id.sql
-- Add dns_record_id column to store Cloudflare DNS record ID for proper cleanup

ALTER TABLE lab_environments
  ADD COLUMN IF NOT EXISTS dns_record_id TEXT;
