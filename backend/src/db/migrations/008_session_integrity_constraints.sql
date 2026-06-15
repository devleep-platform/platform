-- 008_session_integrity_constraints.sql
-- Add constraints to enforce session integrity:
-- 1. Only one active/provisioning session per user per lab
-- 2. Strong environment_id foreign key
-- 3. Optimize status queries with partial indexes

-- First, clean up duplicate active sessions (keep the most recent one per user+lab)
-- This resolves the duplicate key violation issue
WITH duplicates AS (
  SELECT
    user_id,
    lab_id,
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, lab_id ORDER BY created_at DESC) as rn
  FROM lab_sessions
  WHERE status IN ('provisioning', 'active', 'scenario_switching')
)
UPDATE lab_sessions
SET status = 'destroyed', destroyed_at = now()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Prevent multiple active sessions for the same lab per user
-- Using partial unique index: only enforced when status is provisioning/active/scenario_switching
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_sessions_one_active_per_lab
  ON lab_sessions(user_id, lab_id)
  WHERE status IN ('provisioning', 'active', 'scenario_switching');

-- Make environment_id non-null when status is active or beyond
ALTER TABLE lab_sessions
  ADD CONSTRAINT lab_sessions_env_required_when_active
  CHECK (status NOT IN ('active', 'scenario_switching', 'validating') OR environment_id IS NOT NULL);

-- Index for fast session recovery queries
CREATE INDEX IF NOT EXISTS idx_lab_sessions_user_active
  ON lab_sessions(user_id, status)
  WHERE status IN ('provisioning', 'active', 'scenario_switching');

-- Index for user session history (pagination)
CREATE INDEX IF NOT EXISTS idx_lab_sessions_user_created
  ON lab_sessions(user_id, created_at DESC);

-- Index for environment cleanup queries
CREATE INDEX IF NOT EXISTS idx_lab_sessions_environment_status
  ON lab_sessions(environment_id, status)
  WHERE status != 'destroyed';

-- Ensure environment_id foreign key exists and is properly constrained
ALTER TABLE lab_sessions
  DROP CONSTRAINT IF EXISTS lab_sessions_environment_id_fkey CASCADE;

ALTER TABLE lab_sessions
  ADD CONSTRAINT lab_sessions_environment_id_fkey
  FOREIGN KEY (environment_id) REFERENCES lab_environments(id) ON DELETE SET NULL;

-- Status should only be valid states
ALTER TABLE lab_sessions
  ADD CONSTRAINT lab_sessions_valid_status
  CHECK (status IN (
    'provisioning',      -- Environment being created
    'active',            -- Ready for user
    'scenario_switching', -- Transitioning between labs
    'validating',        -- Running validation checks
    'completed',         -- Lab completed successfully
    'failed',            -- Lab failed or error occurred
    'destroyed'          -- Cleaned up
  ));
