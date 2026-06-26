-- 01-is-admin.sql
-- pgTAP tests for public.is_admin() using Basejump Supabase test helpers

BEGIN;

-- We will run 4 assertions:
-- 1) admin user -> true
-- 2) regular user -> false
-- 3) anon (no auth) -> false
-- 4) sanity check: function exists
SELECT plan(4);

-- Sanity: function exists
SELECT has_function(
  'public', 'is_admin', ARRAY[]::text[],
  'public.is_admin() exists'
);

-- Create two Supabase auth users
SELECT tests.create_supabase_user('admin_user');
SELECT tests.create_supabase_user('regular_user');

-- Seed public.users to satisfy FK to auth.users and assign roles
INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('admin_user'),   'admin', 'Admin User'),
  (tests.get_supabase_uid('regular_user'), 'user',  'Regular User')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      display_name = EXCLUDED.display_name;

-- Admin session => is_admin() = true
SELECT tests.authenticate_as('admin_user');
SELECT results_eq(
  $$ SELECT public.is_admin() $$,
  $$ VALUES (TRUE) $$,
  'admin user returns true for is_admin()'
);

-- Regular session => is_admin() = false
SELECT tests.authenticate_as('regular_user');
SELECT results_eq(
  $$ SELECT public.is_admin() $$,
  $$ VALUES (FALSE) $$,
  'regular user returns false for is_admin()'
);

-- Under the closed-by-default baseline (ADR-0011) anon has no EXECUTE on is_admin()
-- (PUBLIC was revoked), so the call is denied at the privilege layer, not by the function
-- body. The non-admin -> false path is covered by the regular_user case above.
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT public.is_admin() $$,
  '42501', NULL,
  'anon cannot execute is_admin() -- no PUBLIC grant'
);
RESET ROLE;

-- Finish & rollback
SELECT * FROM finish();
ROLLBACK;
