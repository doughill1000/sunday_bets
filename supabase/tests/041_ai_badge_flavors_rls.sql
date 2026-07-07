-- 041_ai_badge_flavors_rls.sql
-- pgTAP tests for ai_badge_flavors RLS, grant baseline, and cross-group isolation.
-- ADR-0002 (group tenancy boundary) + ADR-0011 (closed-by-default) + ADR-0008 (AI output).

BEGIN;

SELECT plan(11);

-- ── Structure ─────────────────────────────────────────────────────────────────
SELECT has_table('public', 'ai_badge_flavors', 'public.ai_badge_flavors exists');
SELECT has_column('public', 'ai_badge_flavors', 'group_id',    'ai_badge_flavors has group_id');
SELECT has_column('public', 'ai_badge_flavors', 'season_year', 'ai_badge_flavors has season_year');
SELECT has_column('public', 'ai_badge_flavors', 'badge_id',    'ai_badge_flavors has badge_id');
SELECT has_column('public', 'ai_badge_flavors', 'flavor',      'ai_badge_flavors has flavor');
SELECT has_column('public', 'ai_badge_flavors', 'facts',       'ai_badge_flavors has facts');

-- ── Seed fixtures ─────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('abf_member_a');
SELECT tests.create_supabase_user('abf_member_b');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('abf_member_a'), 'player', 'ABF Member A'),
  (tests.get_supabase_uid('abf_member_b'), 'player', 'ABF Member B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4040-8000-0000000000c1', 'ABF Group A'),
  ('00000000-0000-4040-8000-0000000000d1', 'ABF Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4040-8000-0000000000c1', tests.get_supabase_uid('abf_member_a'), 'member'),
  ('00000000-0000-4040-8000-0000000000d1', tests.get_supabase_uid('abf_member_b'), 'member');

-- Seed one badge flavor for each group via service role.
INSERT INTO public.ai_badge_flavors (group_id, season_year, badge_id, flavor, facts)
VALUES
  ('00000000-0000-4040-8000-0000000000c1', 2025, 'the-sharp', 'Group A sharp flavor.', '{}'),
  ('00000000-0000-4040-8000-0000000000d1', 2025, 'the-sharp', 'Group B sharp flavor.', '{}');

-- ── RLS: member reads only their own group's rows ─────────────────────────────
SELECT tests.authenticate_as('abf_member_a');

SELECT results_eq(
  $$ SELECT flavor FROM public.ai_badge_flavors WHERE season_year = 2025 AND badge_id = 'the-sharp' $$,
  $$ VALUES ('Group A sharp flavor.'::text) $$,
  'abf_member_a sees only Group A badge flavor row'
);

-- ── Cross-group isolation: member_a cannot see Group B rows ───────────────────
SELECT is(
  (SELECT count(*)::int FROM public.ai_badge_flavors WHERE group_id = '00000000-0000-4040-8000-0000000000d1'),
  0,
  'abf_member_a cannot see Group B badge flavor rows'
);

-- ── Client write denied ───────────────────────────────────────────────────────
SELECT throws_ok(
  $$ INSERT INTO public.ai_badge_flavors (group_id, season_year, badge_id, flavor, facts)
     VALUES ('00000000-0000-4040-8000-0000000000c1', 2025, 'the-ghost', 'injected', '{}') $$,
  '42501',
  NULL,
  'authenticated client cannot INSERT into ai_badge_flavors'
);

-- ── Unique dedup (service role) ──────────────────────────────────────────────
SELECT tests.clear_authentication();
RESET ROLE;

SELECT throws_ok(
  $$ INSERT INTO public.ai_badge_flavors (group_id, season_year, badge_id, flavor, facts)
     VALUES ('00000000-0000-4040-8000-0000000000c1', 2025, 'the-sharp', 'duplicate', '{}') $$,
  '23505',
  NULL,
  'inserting duplicate badge row for same group+year+badge throws unique_violation'
);

-- ── anon denied ───────────────────────────────────────────────────────────────
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT 1 FROM public.ai_badge_flavors LIMIT 1 $$,
  '42501',
  NULL,
  'anon denied SELECT on ai_badge_flavors'
);

ROLLBACK;
