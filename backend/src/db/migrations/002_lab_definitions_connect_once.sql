-- 002_lab_definitions_connect_once.sql
-- Connect-once IAM model: curriculum in JSONB, no per-lab R2 keys.

ALTER TABLE lab_definitions
  DROP COLUMN IF EXISTS validation_config_key,
  DROP COLUMN IF EXISTS iam_policy_key;

ALTER TABLE lab_definitions
  ADD COLUMN IF NOT EXISTS scenario_id TEXT;

ALTER TABLE lab_definitions
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';

ALTER TABLE lab_definitions
  ADD COLUMN IF NOT EXISTS outputs_mapping JSONB NOT NULL DEFAULT '{}';

ALTER TABLE lab_definitions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Normalize legacy git:: terraform_module values (example)
UPDATE lab_definitions
  SET terraform_module = 'labs/linux-ec2'
  WHERE terraform_module LIKE 'git::%linux%';

UPDATE lab_definitions
  SET terraform_module = 'labs/docker-ec2'
  WHERE terraform_module LIKE 'git::%docker%';
