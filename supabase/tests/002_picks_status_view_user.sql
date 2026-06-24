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
  ('TEAM_B','Team B','B'),
  ('TEAM_C','Team C','C')
ON CONFLICT (external_key) DO NOTHING;

-- Two future games in the same week. The matchup uniqueness constraint
-- (uq_games_matchup) is on the *unordered* team pair, so the two games must be
-- distinct matchups. TEAM_A plays in both (g1 = A vs B, g2 = A vs C) so user_a
-- can still pick TEAM_A in each game; user_b picks the other participant.
WITH wk AS (
  SELECT id AS week_id
  FROM public.weeks
  WHERE week_number = 1
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2025 LIMIT 1)
)
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT wk.week_id, g.external_game_id, g.commence_time, home.id, away.id
FROM wk
CROSS JOIN (
  VALUES
    ('g1', now() + interval '5 minutes',  'TEAM_A', 'TEAM_B'),
    ('g2', now() + interval '10 minutes', 'TEAM_A', 'TEAM_C')
) g(external_game_id, commence_time, home_key, away_key)
JOIN public.teams home ON home.external_key = g.home_key
JOIN public.teams away ON away.external_key = g.away_key
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

-- user_b picks the away team in each game (TEAM_B in g1, TEAM_C in g2)
SELECT tests.authenticate_as('user_b');
WITH pick AS (
  SELECT g.id AS game_id, away.id AS team_id
  FROM public.games g
  JOIN public.teams away ON away.id = g.away_team_id
  WHERE g.external_game_id IN ('g1','g2')
)
INSERT INTO public.picks (group_id, user_id, game_id, picked_team_id, locked_spread_team_id, locked_spread_value, weight, locked_at, locked_by)
SELECT
  '00000000-0000-4000-8000-000000000002',
  tests.get_supabase_uid('user_b'),
  pick.game_id,
  pick.team_id,
  pick.team_id,
  3,
  'L',
  now(),
  tests.get_supabase_uid('user_b')
FROM pick
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
