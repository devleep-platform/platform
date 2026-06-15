-- 010_add_expert_difficulty.sql
-- Expand difficulty check to include 'expert' for advanced lab tracks.

ALTER TABLE lab_definitions
  DROP CONSTRAINT IF EXISTS lab_definitions_difficulty_check;

ALTER TABLE lab_definitions
  ADD CONSTRAINT lab_definitions_difficulty_check
  CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert'));
