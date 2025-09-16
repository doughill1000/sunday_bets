-- =========================
-- ANON (not signed in)
-- =========================

-- Schema resolve only; no data by default
grant usage on schema public to anon;

-- Don’t let anon call any RPCs by default
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- Enums: anon doesn't need to pass these into RPCs
revoke usage on type public.weight_enum from anon;
revoke usage on type public.side_enum  from anon;

-- If you later add anon-safe read RPCs, grant EXECUTE in those function files.
-- If you add an anon RLS policy to read games/lines directly, you’ll also need:
--   grant select on public.games, public.game_lines to anon;
-- but with current RLS (authenticated-only), that grant would have no effect.
