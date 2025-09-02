-- Give the `service_role` broad permissions on existing and future objects in schema `public`.
-- Run this as the DB owner / admin (the migration runner role).

-- Tables: allow full DML and related privileges
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequences: allow usage and select (for nextval/last_value access)
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Functions (RPCs): ensure execute (duplicated if prior migration exists is harmless)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Views: SELECT
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role; -- views included as tables

-- Ensure future objects created by the current role will grant the same privileges to service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT
  ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE
  ON FUNCTIONS TO service_role;