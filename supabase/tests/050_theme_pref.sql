-- 050_theme_pref.sql
-- pgTAP for the per-user theme preference column (issue #532).
-- ADR-0014 (auth-context caching — the column rides the cached users profile).
--
-- Write path: like every public.users column (display_name, avatar_key,
-- show_team_trends), theme_pref is written by the SERVICE ROLE in /api/profile after
-- the server validates the authenticated user. The `authenticated` role holds only
-- SELECT on public.users — there is intentionally no client UPDATE grant, since one
-- would let a user set arbitrary columns (e.g. role='admin') on their own row. The
-- upd_users_self RLS policy exists but is moot without that grant; the server is the
-- gatekeeper. These tests therefore assert the column/constraint hold for the writer
-- and that a client cannot bypass the server with a direct write.
--
-- Acceptance criteria verified here:
--   1. public.users.theme_pref exists, is text, NOT NULL, defaults to 'dark'.
--   2. A named check constraint restricts it to 'dark' | 'light' | 'system'.
--   3. The writer can set a valid value and it persists.
--   4. An invalid value is rejected by the check constraint (23514).
--   5. A client (authenticated) cannot write public.users directly (42501) — writes
--      are service-role-only.

begin;

select plan(9);

-- ── Schema sanity ─────────────────────────────────────────────────────────────

select has_column('public', 'users', 'theme_pref', 'users has theme_pref');
select col_not_null('public', 'users', 'theme_pref', 'users.theme_pref is not null');
select col_type_is('public', 'users', 'theme_pref', 'text', 'users.theme_pref is text');

select results_eq(
  $$ select count(*)::int from pg_constraint
     where conrelid = 'public.users'::regclass
       and contype = 'c'
       and conname = 'users_theme_pref_check' $$,
  $$ values (1) $$,
  'users_theme_pref_check constraint exists'
);

-- ── Seed users (the auth helper creates the public.users mirror via trigger) ───

select tests.create_supabase_user('theme_owner');
select tests.create_supabase_user('theme_other');

-- 1. New rows take the 'dark' default (backfills existing users on migration too).
select results_eq(
  $$ select theme_pref from public.users where id = tests.get_supabase_uid('theme_owner') $$,
  $$ values ('dark'::text) $$,
  'theme_pref defaults to dark'
);

-- ── Writer path (the service-role /api/profile write) ─────────────────────────
-- Run as the default (owner) role, which stands in for the privileged server writer.

select lives_ok(
  $$ update public.users set theme_pref = 'light'
     where id = tests.get_supabase_uid('theme_owner') $$,
  'writer can set a valid theme_pref'
);

select results_eq(
  $$ select theme_pref from public.users where id = tests.get_supabase_uid('theme_owner') $$,
  $$ values ('light'::text) $$,
  'valid theme_pref update persisted'
);

-- 4. Invalid value rejected by the check constraint (applies to every writer).
select throws_ok(
  $$ update public.users set theme_pref = 'sepia'
     where id = tests.get_supabase_uid('theme_owner') $$,
  '23514',
  null,
  'invalid theme_pref violates users_theme_pref_check'
);

-- ── Client cannot bypass the server ───────────────────────────────────────────
-- authenticated has SELECT only; a direct UPDATE is denied (42501), so a user cannot
-- tamper with their own (or anyone's) users row — theme_pref is written server-side.

select tests.authenticate_as('theme_owner');

select throws_ok(
  $$ update public.users set theme_pref = 'light'
     where id = tests.get_supabase_uid('theme_owner') $$,
  '42501',
  null,
  'a client cannot write public.users directly (service-role-only)'
);

select * from finish();
rollback;
