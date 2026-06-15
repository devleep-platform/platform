-- 005_lab_environments_tunnel_hostname.sql
-- For databases created by schema.ts before tunnel_hostname was in CREATE TABLE.

ALTER TABLE lab_environments
  ADD COLUMN IF NOT EXISTS tunnel_hostname TEXT;
