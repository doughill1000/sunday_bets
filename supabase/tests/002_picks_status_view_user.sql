-- 02-picks-status-view-user.sql
-- pgTAP tests for public.picks_status_view_user

BEGIN;

SELECT plan(6);

-- 1) View exists
SELECT has_view('public', 'picks_status_view_user', 'picks_status_view_user exists');

-- 2) Create two Supabase auth users
SELECT tests.create_supabase_user('user_a');
SELECT tests.create_supabase_user('user_b');

INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4000-8000-000000000002', 'Picks Status Group')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000000002', tests.get_supabase_uid('user_a'), 'member'),
  ('00000000-0000-4000-8000-000000000002', tests.get_supabase_uid('user_b'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 3) Seed minimal season/week
INSERT INTO public.seasons (year)
VALUES (2025)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2025 LIMIT 1),
  1,
  now(),
  now() + interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('TEAM_A','Team A','A'),
  ('TEAM_B','Team B','B')
ON CONFLICT (external_key) DO NOTHING;

-- Two future games in the same week (TEAM_A home, TEAM_B away)
WITH wk AS (
  SELECT id AS week_id
  FROM public.weeks
  WHERE week_number = 1
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2025 LIMIT 1)
), t AS (
  SELECT
    (SELECT id FROM public.teams WHERE external_key = 'TEAM_A') AS home_id,
    (SELECT id FROM public.teams WHERE external_key = 'TEAM_B') AS away_id
)
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT wk.week_id, 'g1', now() + interval '5 minutes',  t.home_id, t.away_id FROM wk, t
UNION ALL
SELECT wk.week_id, 'g2', now() + interval '10 minutes', t.home_id, t.away_id FROM wk, t
ON CONFLICT (external_game_id) DO NOTHING;

-- 4) Insert picks directly with locked_at set (RLS satisfied by auth)
-- user_a picks HOME (TEAM_A)
SELECT tests.authenticate_as('user_a');
WITH g AS (
  SELECT id FROM public.games WHERE external_game_id IN ('g1','g2')
), team AS (
  SELECT id AS team_id FROM public.teams WHERE external_key = 'TEAM_A'
)
INSERT INTO public.picks (group_id, user_id, game_id, picked_team_id, locked_spread_team_id, locked_spread_value, weight, locked_at, locked_by)
SELECT
  '00000000-0000-4000-8000-000000000002',
  tests.get_supabase_uid('user_a'),
  g.id,
  team.team_id,
  team.team_id,  -- or the correct spread side team id
  3,
  'L',
  now(),
  tests.get_supabase_uid('user_a')
FROM g, team;

-- user_b picks AWAY (TEAM_B)
SELECT tests.authenticate_as('user_b');
WITH g AS (
  SELECT id FROM public.games WHERE external_game_id IN ('g1','g2')
), team AS (
  SELECT id AS team_id FROM public.teams WHERE external_key = 'TEAM_B'
)
INSERT INTO public.picks (group_id, user_id, game_id, picked_team_id, locked_spread_team_id, locked_spread_value, weight, locked_at, locked_by)
SELECT
  '00000000-0000-4000-8000-000000000002',
  tests.get_supabase_uid('user_b'),
  g.id,
  team.team_id,
  team.team_id,
  3,
  'L',
  now(),
  tests.get_supabase_uid('user_b')
FROM g, team
ON CONFLICT DO NOTHING;

-- 5) Assertions for user_a
SELECT tests.authenticate_as('user_a');
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_view_user $$,
  $$ VALUES (2::bigint) $$,
  'user_a sees exactly their 2 picks'
);
SELECT results_eq(
  $$ SELECT count(DISTINCT user_id) FROM public.picks_status_view_user $$,
  $$ VALUES (1::bigint) $$,
  'user_a result set only contains a single user_id'
);

-- 6) Assertions for user_b
SELECT tests.authenticate_as('user_b');
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_view_user $$,
  $$ VALUES (2::bigint) $$,
  'user_b sees exactly their 2 picks'
);
SELECT results_eq(
  $$ SELECT count(DISTINCT user_id) FROM public.picks_status_view_user $$,
  $$ VALUES (1::bigint) $$,
  'user_b result set only contains a single user_id'
);

SELECT tests.clear_authentication();
SET ROLE anon;

SELECT throws_ok(
  $$ SELECT * FROM public.picks_status_view_user LIMIT 1 $$,
  '42501',
  'permission denied for view picks_status_view_user'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
