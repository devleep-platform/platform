-- 004_lab_sessions_environment.sql
-- Link sessions to shared environments; real-time and OpenTofu metadata.

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES lab_environments(id);

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS durable_object_id TEXT;

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS tf_state_key TEXT;

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS terraform_outputs JSONB NOT NULL DEFAULT '{}';

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS score INT;

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS destroyed_at TIMESTAMPTZ;

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMPTZ;

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lab_sessions_environment_id
  ON lab_sessions(environment_id);

CREATE INDEX IF NOT EXISTS idx_lab_sessions_timeout_at
  ON lab_sessions(timeout_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_validation_runs_session_id
  ON validation_runs(session_id, created_at DESC);
