-- 030_ai_recaps_rls.sql
-- pgTAP tests for ai_recaps RLS, grant baseline, and cross-group isolation.
-- ADR-0002 (group tenancy boundary) + ADR-0008 (AI output persistence) + ADR-0011 (closed-by-default).

BEGIN;

SELECT plan(10);

-- ── Structure ─────────────────────────────────────────────────────────────────
SELECT has_table('public', 'ai_recaps', 'public.ai_recaps exists');
SELECT has_column('public', 'ai_recaps', 'group_id',   'ai_recaps has group_id');
SELECT has_column('public', 'ai_recaps', 'season_year','ai_recaps has season_year');
SELECT has_column('public', 'ai_recaps', 'week_number','ai_recaps has week_number');
SELECT has_column('public', 'ai_recaps', 'prose',      'ai_recaps has prose');
SELECT has_column('public', 'ai_recaps', 'facts',      'ai_recaps has facts');

-- ── Seed fixtures ─────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('ar_member_a');
SELECT tests.create_supabase_user('ar_member_b');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('ar_member_a'), 'player', 'AR Member A'),
  (tests.get_supabase_uid('ar_member_b'), 'player', 'AR Member B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4028-8000-0000000000a1', 'AR Group A'),
  ('00000000-0000-4028-8000-0000000000b1', 'AR Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4028-8000-0000000000a1', tests.get_supabase_uid('ar_member_a'), 'member'),
  ('00000000-0000-4028-8000-0000000000b1', tests.get_supabase_uid('ar_member_b'), 'member');

-- Seed a recap for each group via service role.
INSERT INTO public.ai_recaps (group_id, season_year, week_number, prose, facts)
VALUES
  ('00000000-0000-4028-8000-0000000000a1', 2025, 5, 'Group A recap prose.', '{"spice":"medium"}'),
  ('00000000-0000-4028-8000-0000000000b1', 2025, 5, 'Group B recap prose.', '{"spice":"mild"}');

-- ── RLS: member reads only their own group's recaps ───────────────────────────
SELECT tests.authenticate_as('ar_member_a');

SELECT results_eq(
  $$ SELECT prose FROM public.ai_recaps WHERE season_year = 2025 AND week_number = 5 $$,
  $$ VALUES ('Group A recap prose.'::text) $$,
  'ar_member_a sees only Group A recap'
);

-- ── Cross-group isolation: member_a cannot see Group B recap ──────────────────
SELECT is(
  (SELECT count(*)::int FROM public.ai_recaps WHERE group_id = '00000000-0000-4028-8000-0000000000b1'),
  0,
  'ar_member_a cannot see Group B recap'
);

-- ── Client write denied ───────────────────────────────────────────────────────
SELECT throws_ok(
  $$ INSERT INTO public.ai_recaps (group_id, season_year, week_number, prose, facts)
     VALUES ('00000000-0000-4028-8000-0000000000a1', 2025, 6, 'injected', '{}') $$,
  '42501',
  NULL,
  'authenticated client cannot INSERT into ai_recaps'
);

-- ── anon denied ───────────────────────────────────────────────────────────────
SELECT tests.clear_authentication();
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT 1 FROM public.ai_recaps LIMIT 1 $$,
  '42501',
  NULL,
  'anon denied SELECT on ai_recaps'
);

ROLLBACK;
