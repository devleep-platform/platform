-- 014_lab_sessions_validation_results.sql
-- Store per-check validation results in the session row so the API can return them
-- without depending on CF Worker Durable Object storage.
ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS validation_results JSONB;
