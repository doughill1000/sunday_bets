-- 1) Let anon/authenticated use the schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Functions (RPCs): allow execution now and in the future
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, service_role, authenticated;

-- Future-proof new functions:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon,service_role, authenticated;

-- 3) Base table privileges (RLS still applies!):
-- Read-only tables for all signed-in users
GRANT SELECT ON public.games, public.game_lines, public.results, public.totals, public.users, public.weeks, public.seasons
TO authenticated;

-- Picks: allow the operations; RLS will enforce *who/when/what*
GRANT SELECT, INSERT, UPDATE ON public.picks TO authenticated;

-- Settings & audit: read/modify only through admin policies; still need privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings, public.audit_log TO authenticated;

-- Optional: anon can read public game data if you ever serve it without a session
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.games, public.game_lines TO anon;

-- 4) If you’re using the ENUM in client params, allow type usage (usually not needed, but harmless)
GRANT USAGE ON TYPE public.weight_enum TO anon, authenticated;

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