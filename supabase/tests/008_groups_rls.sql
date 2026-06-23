-- 008_groups_rls.sql
-- pgTAP tests for groups / group_memberships structure and RLS.

BEGIN;

SELECT plan(17);

-- Structure -----------------------------------------------------------------
SELECT has_table('public', 'groups', 'public.groups exists');
SELECT has_table('public', 'group_memberships', 'public.group_memberships exists');
SELECT has_column('public', 'groups', 'id', 'groups has id');
SELECT has_column('public', 'groups', 'name', 'groups has name');
SELECT has_column('public', 'group_memberships', 'group_id', 'group_memberships has group_id');
SELECT has_column('public', 'group_memberships', 'user_id', 'group_memberships has user_id');
SELECT has_column('public', 'group_memberships', 'role', 'group_memberships has role');
SELECT has_function(
  'public',
  'is_member',
  ARRAY['uuid'],
  'public.is_member(uuid) exists'
);

-- Seed users and groups as service role -------------------------------------
SELECT tests.create_supabase_user('group_a_member');
SELECT tests.create_supabase_user('group_a_commissioner');
SELECT tests.create_supabase_user('group_b_member');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('group_a_member'), 'player', 'Group A Member'),
  (tests.get_supabase_uid('group_a_commissioner'), 'player', 'Group A Commissioner'),
  (tests.get_supabase_uid('group_b_member'), 'player', 'Group B Member')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Group A'),
  ('00000000-0000-4000-8000-0000000000b1', 'Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  (
    '00000000-0000-4000-8000-0000000000a1',
    tests.get_supabase_uid('group_a_member'),
    'member'
  ),
  (
    '00000000-0000-4000-8000-0000000000a1',
    tests.get_supabase_uid('group_a_commissioner'),
    'commissioner'
  ),
  (
    '00000000-0000-4000-8000-0000000000b1',
    tests.get_supabase_uid('group_b_member'),
    'member'
  );

-- Member can see only their own group and its memberships -------------------
SELECT tests.authenticate_as('group_a_member');

SELECT results_eq(
  $$ SELECT public.is_member('00000000-0000-4000-8000-0000000000a1'::uuid) $$,
  $$ VALUES (TRUE) $$,
  'is_member() returns true for the caller group'
);

SELECT results_eq(
  $$ SELECT public.is_member('00000000-0000-4000-8000-0000000000b1'::uuid) $$,
  $$ VALUES (FALSE) $$,
  'is_member() returns false for another group'
);

SELECT results_eq(
  $$ SELECT array_agg(name ORDER BY name) FROM public.groups $$,
  $$ VALUES (ARRAY['Group A']::text[]) $$,
  'member can read their own group row only'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships $$,
  $$ VALUES (2::bigint) $$,
  'member can read membership rows for their own group only'
);

SELECT results_eq(
  $$ SELECT role FROM public.group_memberships WHERE user_id = tests.get_supabase_uid('group_a_commissioner') $$,
  $$ VALUES ('commissioner'::public.group_membership_role) $$,
  'commissioner role is distinguishable from member'
);

SELECT throws_ok(
  $$ INSERT INTO public.group_memberships (group_id, user_id, role)
     VALUES (
       '00000000-0000-4000-8000-0000000000b1',
       tests.get_supabase_uid('group_a_member'),
       'member'
     ) $$,
  '42501',
  NULL,
  'member cannot insert a membership into another group'
);

-- Group B cannot see Group A -------------------------------------------------
SELECT tests.authenticate_as('group_b_member');

SELECT results_eq(
  $$ SELECT array_agg(name ORDER BY name) FROM public.groups $$,
  $$ VALUES (ARRAY['Group B']::text[]) $$,
  'other group member cannot read Group A'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships $$,
  $$ VALUES (1::bigint) $$,
  'other group member cannot read Group A memberships'
);

-- anon has no table access ---------------------------------------------------
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT * FROM public.groups LIMIT 1 $$,
  '42501',
  NULL,
  'anon gets permission denied on groups'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
