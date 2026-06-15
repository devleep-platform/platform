-- Track the Cloudflare DNS record ID for the ssh-xxx.devleep.com hostname
-- so it can be deleted alongside the tunnel during teardown.
ALTER TABLE lab_environments
  ADD COLUMN IF NOT EXISTS ssh_dns_record_id TEXT;
