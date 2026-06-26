-- Closed-by-default role baseline. See ADR-0011 (design) and ADR-0012 (rollout).
--
-- This file is the SINGLE place the `public` schema is closed by default. It lives in
-- schemas/ with a low numeric prefix so the generator emits it early -- before any
-- function, table, policy, or grant file. Every other grant file (player_grants,
-- admin_grants, zz_*) and every function's own grant runs in a LATER generator phase and
-- selectively RE-OPENS specific objects to specific roles, so nothing here can clobber an
-- intended grant and no `zz_` ordering hack is needed.
--
-- TABLES are closed by default privileges. A postgres-created table in `public` is born
-- owner+service_role only (the built-in table default is owner-only) -- verified
-- empirically. The `alter default privileges ... revoke all on tables from anon,
-- authenticated` keeps the postgres table default explicitly closed to the two client
-- roles; each table's grant file re-opens exactly what it needs.
--
-- FUNCTIONS cannot be closed by default privileges here (the built-in PUBLIC execute grant
-- cannot be subtracted -- see 0000_function_acl_guard.sql). So function closure is done two
-- ways: (1) the `_close_new_fn_acl` event trigger activated below strips PUBLIC execute
-- from every NEW function (future migrations and the from-empty squash); and (2) the
-- one-time `revoke execute on all functions ... from public` at the bottom closes functions
-- that ALREADY exist when this baseline first runs (the trigger only fires on creation).
-- Both revoke only the implicit PUBLIC grant; explicit grants survive. The pgTAP authz
-- matrix (tests/021) fails CI if any `public` function is ever PUBLIC-executable.
--
-- ENUM/type USAGE is deliberately left alone: it was empirically verified inert at runtime
-- in this schema (column reads/writes, casts, and enum-arg function calls all succeed with
-- USAGE stripped from both PUBLIC and the role), authenticated/anon have no CREATE on
-- `public` to exploit it at DDL time, and (lacking a `REVOKE ... ON ALL TYPES` form)
-- revoking it would break the squash for no security gain.

-- Schema resolution: the three app roles may resolve names in `public` (USAGE only, never
-- CREATE). service_role's table/function access comes from admin_grants.sql.
grant usage on schema public to anon, authenticated, service_role;
revoke create on schema public from public, anon, authenticated;

-- Tables postgres creates from here on are born closed to the client roles.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

-- Activate the function ACL guard from 0000_function_acl_guard.sql. WHEN restricts firing
-- to function-creation events so the guard's own REVOKE never re-enters it. drop-if-exists
-- keeps the statement idempotent across resets.
drop event trigger if exists _close_new_fn_acl;
create event trigger _close_new_fn_acl
  on ddl_command_end
  when tag in ('CREATE FUNCTION')
  execute function public._close_new_fn_acl();

-- One-time closure of objects that already exist when this first runs (no-ops from empty;
-- also closes _close_new_fn_acl itself, created before its trigger). Explicit role grants
-- from the re-open files survive -- only implicit PUBLIC / auto-anon access is cut.
revoke execute on all functions in schema public from public;
revoke all on all tables in schema public from public, anon;
