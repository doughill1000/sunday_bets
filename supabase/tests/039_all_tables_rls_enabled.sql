-- 039_all_tables_rls_enabled.sql
-- Set-based RLS-enable guard for the closed-by-default baseline (ADR-0011).
--
-- Under that baseline every `public` table is granted to `authenticated` explicitly
-- and relies on RLS to scope which rows that role can see. A table that is granted
-- but is missing its `enable row level security` line is therefore not merely
-- unprotected -- it exposes FULL-TABLE reads to `authenticated`. `policies/` is the
-- sole owner of the RLS surface (schemas/0300_rls.sql was collapsed to a no-op in
-- migration 20260702200954), so a new table simply forgetting its enable line is the
-- realistic failure mode this guards against.
--
-- The assertion is set-based (one pass over pg_class), so it needs no maintenance as
-- tables are added: any future `public` base table without RLS fails CI here. This is
-- the P2 #9 gap the 2026-07-02 pattern audit flagged (no such guard existed). It
-- complements 019_authz_matrix.sql (per-table reachability) and
-- 021_function_grant_baseline.sql (function EXECUTE closure) with a table-level
-- "is RLS even on?" invariant.
--
-- Scope: base tables (`relkind` in 'r'/'p') in the `public` schema. Extension-owned
-- relations are excluded -- they are managed by their extension (installed into the
-- `extensions` schema by convention) and are not part of the app's tenancy surface.

BEGIN;

SELECT plan(3);

-- 1. The invariant: no `public` base table has RLS disabled. On failure pgTAP prints
--    the offending table name(s), so a forgotten enable line is named directly.
SELECT is_empty(
  $$ SELECT c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND c.relrowsecurity = false
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
         WHERE d.objid = c.oid AND d.deptype = 'e'
       ) $$,
  'every base table in public has row level security enabled'
);

-- 2. Anti-vacuity: confirm the guard actually enumerated tables. A typo'd schema name
--    or over-tight filter would make assertion 1 pass while checking nothing.
SELECT isnt_empty(
  $$ SELECT c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
         WHERE d.objid = c.oid AND d.deptype = 'e'
       ) $$,
  'the guard enumerates public base tables (assertion 1 is not vacuous)'
);

-- 3. Self-check: a base table born without `enable row level security` is flagged by
--    the guard query. Proves the invariant will fail when a future table omits its
--    enable line. (No event trigger auto-enables RLS on new tables -- only functions
--    are auto-closed, see schemas/0000_function_acl_guard.sql -- so this table is born
--    with relrowsecurity = false.) Dropped immediately; the whole test rolls back.
CREATE TABLE public._rls_guard_probe (id int);

SELECT isnt_empty(
  $$ SELECT c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity = false
       AND c.relname = '_rls_guard_probe' $$,
  'a public base table created without RLS is flagged by the guard'
);

DROP TABLE public._rls_guard_probe;

SELECT * FROM finish();
ROLLBACK;
