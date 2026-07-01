-- 036_recap_seen_rls.sql
-- pgTAP tests for recap_seen structure, self-service RLS, and cross-group/user
-- isolation (#302). Unlike ai_recaps/notification_log (service-role writes
-- only), recap_seen is written directly by the authenticated player on flash
-- dismiss, so it follows push_subscriptions' self-service RLS shape instead.

BEGIN;

SELECT plan(13);

-- ── Structure ─────────────────────────────────────────────────────────────────
SELECT has_table('public', 'recap_seen', 'public.recap_seen exists');
SELECT has_column('public', 'recap_seen', 'user_id',     'recap_seen has user_id');
SELECT has_column('public', 'recap_seen', 'group_id',    'recap_seen has group_id');
SELECT has_column('public', 'recap_seen', 'season_year', 'recap_seen has season_year');
SELECT has_column('public', 'recap_seen', 'week_number', 'recap_seen has week_number');

-- ── Seed fixtures ─────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('rs_member_a');
SELECT tests.create_supabase_user('rs_member_b');
SELECT tests.create_supabase_user('rs_outsider');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('rs_member_a'), 'player', 'RS Member A'),
  (tests.get_supabase_uid('rs_member_b'), 'player', 'RS Member B'),
  (tests.get_supabase_uid('rs_outsider'), 'player', 'RS Outsider')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4036-8000-0000000000e1', 'RS Group A'),
  ('00000000-0000-4036-8000-0000000000f1', 'RS Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4036-8000-0000000000e1', tests.get_supabase_uid('rs_member_a'), 'member'),
  ('00000000-0000-4036-8000-0000000000f1', tests.get_supabase_uid('rs_member_b'), 'member');
-- rs_outsider deliberately has no membership in either group.

-- ── RLS: member marks their own group's recap seen ───────────────────────────
SELECT tests.authenticate_as('rs_member_a');

SELECT lives_ok(
  $$ INSERT INTO public.recap_seen (user_id, group_id, season_year, week_number)
     VALUES (tests.get_supabase_uid('rs_member_a'),
             '00000000-0000-4036-8000-0000000000e1', 2025, 5) $$,
  'member can mark their own group''s recap seen'
);

SELECT lives_ok(
  $$ UPDATE public.recap_seen SET seen_at = now()
     WHERE user_id = tests.get_supabase_uid('rs_member_a')
       AND group_id = '00000000-0000-4036-8000-0000000000e1'
       AND season_year = 2025 AND week_number = 5 $$,
  'member can update their own seen-marker (e.g. re-dismiss)'
);

-- Cannot insert a seen-marker for another user.
SELECT throws_ok(
  $$ INSERT INTO public.recap_seen (user_id, group_id, season_year, week_number)
     VALUES (tests.get_supabase_uid('rs_member_b'),
             '00000000-0000-4036-8000-0000000000e1', 2025, 5) $$,
  '42501',
  NULL,
  'cannot insert a seen-marker for another user'
);

-- Cannot insert a seen-marker for a group the caller doesn't belong to.
SELECT throws_ok(
  $$ INSERT INTO public.recap_seen (user_id, group_id, season_year, week_number)
     VALUES (tests.get_supabase_uid('rs_member_a'),
             '00000000-0000-4036-8000-0000000000f1', 2025, 5) $$,
  '42501',
  NULL,
  'cannot insert a seen-marker for a group the caller is not a member of'
);

-- ── Isolation: member_a sees only their own row ──────────────────────────────
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.recap_seen $$,
  $$ VALUES (1) $$,
  'member sees only their own recap_seen row'
);

SELECT tests.authenticate_as('rs_member_b');
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.recap_seen $$,
  $$ VALUES (0) $$,
  'other member cannot see foreign recap_seen rows'
);

-- Outsider (no membership anywhere) cannot mark either group's recap seen.
SELECT tests.authenticate_as('rs_outsider');
SELECT throws_ok(
  $$ INSERT INTO public.recap_seen (user_id, group_id, season_year, week_number)
     VALUES (tests.get_supabase_uid('rs_outsider'),
             '00000000-0000-4036-8000-0000000000e1', 2025, 5) $$,
  '42501',
  NULL,
  'non-member cannot mark a group''s recap seen'
);

-- ── anon denied ───────────────────────────────────────────────────────────────
SELECT tests.clear_authentication();
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT 1 FROM public.recap_seen LIMIT 1 $$,
  '42501',
  NULL,
  'anon denied SELECT on recap_seen'
);

ROLLBACK;
