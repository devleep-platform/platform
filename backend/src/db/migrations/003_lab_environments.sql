-- 003_lab_environments.sql
-- Shared infrastructure per terraform_module (24h lifetime).

CREATE TABLE IF NOT EXISTS lab_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  terraform_module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning',
  terraform_outputs JSONB NOT NULL DEFAULT '{}',
  tunnel_id TEXT,
  tunnel_hostname TEXT,
  current_scenario TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  destroyed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lab_environments_user_module
  ON lab_environments(user_id, terraform_module)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_lab_environments_expires
  ON lab_environments(expires_at)
  WHERE status = 'active';
