-- 011_lab_environments_terraform_state.sql
-- Persist terraform state and vars so teardown survives container restarts.
-- Without this, /tmp/labs/{id}/ is wiped on restart and tofu destroy is silently skipped.

ALTER TABLE lab_environments
  ADD COLUMN IF NOT EXISTS terraform_state TEXT,
  ADD COLUMN IF NOT EXISTS terraform_vars  TEXT;
