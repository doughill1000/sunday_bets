-- 1) Let anon/authenticated use the schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) Make sure they can execute functions (incl. your get_active_week_games)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Future-proof new functions:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

-- 3) Base table privileges (RLS still applies!):
-- Read-only tables for all signed-in users
GRANT SELECT ON public.games, public.game_lines, public.results, public.totals, public.users
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
