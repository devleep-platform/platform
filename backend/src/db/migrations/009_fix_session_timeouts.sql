-- 009_fix_session_timeouts.sql
-- Fix existing sessions with null timeout_at
-- Set timeout_at based on lab's timeout_minutes + created_at

UPDATE lab_sessions ls
SET timeout_at = ls.created_at + INTERVAL '1 minute' * COALESCE(
  (SELECT timeout_minutes FROM lab_definitions WHERE id = ls.lab_id),
  120
)
WHERE ls.timeout_at IS NULL
  AND ls.status IN ('provisioning', 'active', 'scenario_switching');

-- Mark sessions that have already expired as destroyed
UPDATE lab_sessions
SET status = 'destroyed', destroyed_at = NOW()
WHERE status IN ('provisioning', 'active', 'scenario_switching')
  AND timeout_at IS NOT NULL
  AND timeout_at < NOW()
  AND destroyed_at IS NULL;
