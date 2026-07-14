-- 054_wrapped_seen_rls.sql
-- pgTAP tests for wrapped_seen structure, self-service RLS, and cross-group/user
-- isolation (#548). Mirrors 036_recap_seen_rls.sql's shape, minus week_number since
-- Wrapped is season-scoped rather than weekly.

BEGIN;

SELECT plan(12);

-- ── Structure ─────────────────────────────────────────────────────────────────
SELECT has_table('public', 'wrapped_seen', 'public.wrapped_seen exists');
SELECT has_column('public', 'wrapped_seen', 'user_id',     'wrapped_seen has user_id');
SELECT has_column('public', 'wrapped_seen', 'group_id',    'wrapped_seen has group_id');
SELECT has_column('public', 'wrapped_seen', 'season_year', 'wrapped_seen has season_year');

-- ── Seed fixtures ─────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('ws_member_a');
SELECT tests.create_supabase_user('ws_member_b');
SELECT tests.create_supabase_user('ws_outsider');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('ws_member_a'), 'player', 'WS Member A'),
  (tests.get_supabase_uid('ws_member_b'), 'player', 'WS Member B'),
  (tests.get_supabase_uid('ws_outsider'), 'player', 'WS Outsider')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4054-8000-0000000000e1', 'WS Group A'),
  ('00000000-0000-4054-8000-0000000000f1', 'WS Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4054-8000-0000000000e1', tests.get_supabase_uid('ws_member_a'), 'member'),
  ('00000000-0000-4054-8000-0000000000f1', tests.get_supabase_uid('ws_member_b'), 'member');
-- ws_outsider deliberately has no membership in either group.

-- ── RLS: member marks their own group's Wrapped seen ─────────────────────────
SELECT tests.authenticate_as('ws_member_a');

SELECT lives_ok(
  $$ INSERT INTO public.wrapped_seen (user_id, group_id, season_year)
     VALUES (tests.get_supabase_uid('ws_member_a'),
             '00000000-0000-4054-8000-0000000000e1', 2025) $$,
  'member can mark their own group''s Wrapped seen'
);

SELECT lives_ok(
  $$ UPDATE public.wrapped_seen SET seen_at = now()
     WHERE user_id = tests.get_supabase_uid('ws_member_a')
       AND group_id = '00000000-0000-4054-8000-0000000000e1'
       AND season_year = 2025 $$,
  'member can update their own seen-marker (e.g. re-dismiss)'
);

-- Cannot insert a seen-marker for another user.
SELECT throws_ok(
  $$ INSERT INTO public.wrapped_seen (user_id, group_id, season_year)
     VALUES (tests.get_supabase_uid('ws_member_b'),
             '00000000-0000-4054-8000-0000000000e1', 2025) $$,
  '42501',
  NULL,
  'cannot insert a seen-marker for another user'
);

-- Cannot insert a seen-marker for a group the caller doesn't belong to.
SELECT throws_ok(
  $$ INSERT INTO public.wrapped_seen (user_id, group_id, season_year)
     VALUES (tests.get_supabase_uid('ws_member_a'),
             '00000000-0000-4054-8000-0000000000f1', 2025) $$,
  '42501',
  NULL,
  'cannot insert a seen-marker for a group the caller is not a member of'
);

-- ── Isolation: member_a sees only their own row ──────────────────────────────
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.wrapped_seen $$,
  $$ VALUES (1) $$,
  'member sees only their own wrapped_seen row'
);

SELECT tests.authenticate_as('ws_member_b');
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.wrapped_seen $$,
  $$ VALUES (0) $$,
  'other member cannot see foreign wrapped_seen rows'
);

-- Outsider (no membership anywhere) cannot mark either group's Wrapped seen.
SELECT tests.authenticate_as('ws_outsider');
SELECT throws_ok(
  $$ INSERT INTO public.wrapped_seen (user_id, group_id, season_year)
     VALUES (tests.get_supabase_uid('ws_outsider'),
             '00000000-0000-4054-8000-0000000000e1', 2025) $$,
  '42501',
  NULL,
  'non-member cannot mark a group''s Wrapped seen'
);

-- ── anon denied ───────────────────────────────────────────────────────────────
SELECT tests.clear_authentication();
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT 1 FROM public.wrapped_seen LIMIT 1 $$,
  '42501',
  NULL,
  'anon denied SELECT on wrapped_seen'
);

ROLLBACK;
