-- 006_lab_sessions_terminal_token.sql
-- Add terminal_token column for ttyd authentication

ALTER TABLE lab_sessions
  ADD COLUMN IF NOT EXISTS terminal_token TEXT;
