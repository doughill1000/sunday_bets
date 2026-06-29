-- 034_season_wrapped_rls.sql
-- pgTAP tests for season_wrapped RLS, grant baseline, and cross-group isolation.
-- ADR-0002 (group tenancy boundary) + ADR-0011 (closed-by-default).

BEGIN;

SELECT plan(13);

-- ── Structure ─────────────────────────────────────────────────────────────────
SELECT has_table('public', 'season_wrapped', 'public.season_wrapped exists');
SELECT has_column('public', 'season_wrapped', 'group_id',        'season_wrapped has group_id');
SELECT has_column('public', 'season_wrapped', 'season_year',     'season_wrapped has season_year');
SELECT has_column('public', 'season_wrapped', 'scope',           'season_wrapped has scope');
SELECT has_column('public', 'season_wrapped', 'subject_user_id', 'season_wrapped has subject_user_id');
SELECT has_column('public', 'season_wrapped', 'prose',           'season_wrapped has prose');
SELECT has_column('public', 'season_wrapped', 'facts',           'season_wrapped has facts');

-- ── Seed fixtures ─────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('sw_member_a');
SELECT tests.create_supabase_user('sw_member_b');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('sw_member_a'), 'player', 'SW Member A'),
  (tests.get_supabase_uid('sw_member_b'), 'player', 'SW Member B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4034-8000-0000000000c1', 'SW Group A'),
  ('00000000-0000-4034-8000-0000000000d1', 'SW Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4034-8000-0000000000c1', tests.get_supabase_uid('sw_member_a'), 'member'),
  ('00000000-0000-4034-8000-0000000000d1', tests.get_supabase_uid('sw_member_b'), 'member');

-- Seed one league row and one player row for each group via service role.
INSERT INTO public.season_wrapped (group_id, season_year, scope, subject_user_id, prose, facts)
VALUES
  ('00000000-0000-4034-8000-0000000000c1', 2025, 'league', NULL,
   'Group A league wrapped prose.', '{}'),
  ('00000000-0000-4034-8000-0000000000c1', 2025, 'player', tests.get_supabase_uid('sw_member_a'),
   'Group A player wrapped prose.', '{}'),
  ('00000000-0000-4034-8000-0000000000d1', 2025, 'league', NULL,
   'Group B league wrapped prose.', '{}'),
  ('00000000-0000-4034-8000-0000000000d1', 2025, 'player', tests.get_supabase_uid('sw_member_b'),
   'Group B player wrapped prose.', '{}');

-- ── RLS: member reads only their own group's rows ─────────────────────────────
SELECT tests.authenticate_as('sw_member_a');

SELECT results_eq(
  $$ SELECT prose FROM public.season_wrapped WHERE season_year = 2025 AND scope = 'league' $$,
  $$ VALUES ('Group A league wrapped prose.'::text) $$,
  'sw_member_a sees only Group A league wrapped row'
);

-- ── Cross-group isolation: member_a cannot see Group B rows ───────────────────
SELECT is(
  (SELECT count(*)::int FROM public.season_wrapped WHERE group_id = '00000000-0000-4034-8000-0000000000d1'),
  0,
  'sw_member_a cannot see Group B wrapped rows'
);

-- ── Client write denied ───────────────────────────────────────────────────────
SELECT throws_ok(
  $$ INSERT INTO public.season_wrapped (group_id, season_year, scope, prose, facts)
     VALUES ('00000000-0000-4034-8000-0000000000c1', 2025, 'league', 'injected', '{}') $$,
  '42501',
  NULL,
  'authenticated client cannot INSERT into season_wrapped'
);

-- ── Partial-unique dedup (service role) ──────────────────────────────────────
SELECT tests.clear_authentication();
RESET ROLE;

SELECT throws_ok(
  $$ INSERT INTO public.season_wrapped (group_id, season_year, scope, subject_user_id, prose, facts)
     VALUES ('00000000-0000-4034-8000-0000000000c1', 2025, 'league', NULL,
             'duplicate league', '{}') $$,
  '23505',
  NULL,
  'inserting duplicate league row for same group+year throws unique_violation'
);

SELECT throws_ok(
  $$ INSERT INTO public.season_wrapped (group_id, season_year, scope, subject_user_id, prose, facts)
     SELECT '00000000-0000-4034-8000-0000000000c1'::uuid, 2025, 'player',
            tests.get_supabase_uid('sw_member_a'), 'duplicate player', '{}'::jsonb $$,
  '23505',
  NULL,
  'inserting duplicate player row for same group+year+user throws unique_violation'
);

-- ── anon denied ───────────────────────────────────────────────────────────────
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT 1 FROM public.season_wrapped LIMIT 1 $$,
  '42501',
  NULL,
  'anon denied SELECT on season_wrapped'
);

ROLLBACK;
