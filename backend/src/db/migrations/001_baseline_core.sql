-- 001_baseline_core.sql
-- Core platform tables (safe on empty Neon project).
-- Skips objects that already exist.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aws_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role_arn TEXT NOT NULL,
  external_id TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT 'ap-south-1',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS lab_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  terraform_module TEXT NOT NULL,
  estimated_minutes INT DEFAULT 60,
  timeout_minutes INT DEFAULT 120,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  lab_id UUID REFERENCES lab_definitions(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES lab_sessions(id) NOT NULL,
  check_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  result TEXT NOT NULL,
  expected TEXT,
  actual TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_aws_integrations_user_id ON aws_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_user_id_status ON lab_sessions(user_id, status);
