-- 017_create_group.sql
-- pgTAP tests for the gated create-group flow (#148, ADR-0006 decision 3).
-- Acceptance criteria:
--   1. gated mode: only users with can_create_group succeed; others blocked.
--   2. open mode: any authenticated user can create.
--   3. a created group has the creator as commissioner and a seeded group_config.
--   4. name is validated (non-empty, length-bounded); creation is atomic.

BEGIN;

SELECT plan(15);

-- ── Schema checks ─────────────────────────────────────────────────────────────

SELECT has_column('public', 'settings', 'group_creation_mode',
  'settings has group_creation_mode');
SELECT has_column('public', 'users', 'can_create_group',
  'users has can_create_group');
SELECT has_function('public', 'create_group', ARRAY['text', 'timestamp with time zone'],
  'public.create_group(text, timestamptz) exists');

-- ── Seed (service role / superuser) ───────────────────────────────────────────

SELECT tests.create_supabase_user('cg_capable');
SELECT tests.create_supabase_user('cg_incapable');
SELECT tests.create_supabase_user('cg_opener');

INSERT INTO public.users (id, role, display_name, can_create_group)
VALUES
  (tests.get_supabase_uid('cg_capable'),   'player', 'CG Capable',   true),
  (tests.get_supabase_uid('cg_incapable'), 'player', 'CG Incapable', false),
  (tests.get_supabase_uid('cg_opener'),    'player', 'CG Opener',    false)
ON CONFLICT (id) DO UPDATE
  SET can_create_group = EXCLUDED.can_create_group,
      display_name     = EXCLUDED.display_name;

-- Ensure the single global settings row exists and starts in gated mode.
INSERT INTO public.settings (id, group_creation_mode)
VALUES (true, 'gated')
ON CONFLICT (id) DO UPDATE SET group_creation_mode = 'gated';

-- ── Table-level name cap (defense in depth, independent of the RPC) ────────────

SELECT throws_ok(
  $$ INSERT INTO public.groups (name) VALUES (repeat('y', 61)) $$,
  '23514',
  NULL,
  'groups_name_max_len rejects an overlong name at the table level'
);

-- ── 1. gated mode: capable user succeeds ──────────────────────────────────────

SELECT tests.authenticate_as('cg_capable');

SELECT lives_ok(
  $$ SELECT public.create_group('Capable Group') $$,
  'capable user can create a group in gated mode'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.groups WHERE name = 'Capable Group' $$,
  $$ VALUES (1::bigint) $$,
  'gated create: group row was created'
);

SELECT results_eq(
  $$ SELECT gm.role::text, gm.status::text
       FROM public.group_memberships gm
       JOIN public.groups g ON g.id = gm.group_id
      WHERE g.name = 'Capable Group'
        AND gm.user_id = tests.get_supabase_uid('cg_capable') $$,
  $$ VALUES ('commissioner', 'active') $$,
  'gated create: creator is an active commissioner'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_config gc
       JOIN public.groups g ON g.id = gc.group_id
      WHERE g.name = 'Capable Group' $$,
  $$ VALUES (1::bigint) $$,
  'gated create: group_config row was seeded'
);

-- ── 4. name validation (as the capable user) ──────────────────────────────────

SELECT throws_ok(
  $$ SELECT public.create_group('   ') $$,
  'P0010',
  'group name is required',
  'blank name is rejected with P0010'
);

SELECT throws_ok(
  $$ SELECT public.create_group(repeat('x', 61)) $$,
  'P0011',
  'group name too long',
  'overlong name is rejected with P0011'
);

-- ── 1. gated mode: incapable user blocked, atomically ─────────────────────────

SELECT tests.authenticate_as('cg_incapable');

SELECT throws_ok(
  $$ SELECT public.create_group('Should Fail') $$,
  'P0012',
  'group creation is not enabled for this account',
  'incapable user is blocked in gated mode with P0012'
);

-- Verify no orphan group as superuser (bypasses the member-only read policy).
SELECT tests.clear_authentication();
RESET ROLE;

SELECT results_eq(
  $$ SELECT count(*) FROM public.groups WHERE name = 'Should Fail' $$,
  $$ VALUES (0::bigint) $$,
  'blocked create leaves no orphan group (atomic)'
);

-- ── 2. open mode: any authenticated user can create ───────────────────────────

UPDATE public.settings SET group_creation_mode = 'open' WHERE id = true;

SELECT tests.authenticate_as('cg_opener');

SELECT lives_ok(
  $$ SELECT public.create_group('Open Mode Group') $$,
  'non-capable user can create in open mode'
);

SELECT results_eq(
  $$ SELECT gm.role::text
       FROM public.group_memberships gm
       JOIN public.groups g ON g.id = gm.group_id
      WHERE g.name = 'Open Mode Group'
        AND gm.user_id = tests.get_supabase_uid('cg_opener') $$,
  $$ VALUES ('commissioner') $$,
  'open-mode creator is the commissioner'
);

-- ── anon cannot execute the RPC at all ────────────────────────────────────────

SELECT tests.clear_authentication();
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT public.create_group('Anon Group') $$,
  '42501',
  NULL,
  'anon gets permission denied on create_group'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
