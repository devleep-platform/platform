-- 012_lab_sort_order.sql
-- Curriculum sequencing: labs have a deliberate learning order within their track.
-- Default 9999 so unset labs fall to the end rather than breaking ORDER BY.
ALTER TABLE lab_definitions
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 9999;

CREATE INDEX IF NOT EXISTS idx_lab_definitions_sort_order
  ON lab_definitions (sort_order ASC, title ASC);
