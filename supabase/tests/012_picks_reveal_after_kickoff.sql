-- 012_picks_reveal_after_kickoff.sql
-- pgTAP tests for post-kickoff pick reveal via picks_group_view.
-- Covers: (1) same-group cross-member read blocked pre-kickoff,
--         (2) same-group cross-member read allowed post-kickoff,
--         (3) cross-group read denied regardless of kickoff status.

BEGIN;

SELECT plan(4);

-- Seed users
SELECT tests.create_supabase_user('reveal_player_a');
SELECT tests.create_supabase_user('reveal_player_b');
SELECT tests.create_supabase_user('reveal_player_c');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('reveal_player_a'), 'player', 'Reveal Player A'),
  (tests.get_supabase_uid('reveal_player_b'), 'player', 'Reveal Player B'),
  (tests.get_supabase_uid('reveal_player_c'), 'player', 'Reveal Player C')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Seed groups
INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4000-8000-000000000a12', 'Reveal Group 1'),
  ('00000000-0000-4000-8000-000000000b12', 'Reveal Group 2');

-- Group 1: player A and B are members; player C is in Group 2 only
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000000a12', tests.get_supabase_uid('reveal_player_a'), 'member'),
  ('00000000-0000-4000-8000-000000000a12', tests.get_supabase_uid('reveal_player_b'), 'member'),
  ('00000000-0000-4000-8000-000000000b12', tests.get_supabase_uid('reveal_player_c'), 'member');

-- Seed season, week, teams, and two games
INSERT INTO public.seasons (year) VALUES (2031) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1),
  1,
  now() - interval '7 days',
  now() + interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Use four distinct teams so two matchups don't collide on the uq_games_matchup constraint.
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('RV_T1', 'Reveal Team 1', 'RV1'),
  ('RV_T2', 'Reveal Team 2', 'RV2'),
  ('RV_T3', 'Reveal Team 3', 'RV3'),
  ('RV_T4', 'Reveal Team 4', 'RV4')
ON CONFLICT (external_key) DO NOTHING;

-- Future game (kickoff has NOT passed) — T1 vs T2
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT id FROM public.weeks WHERE week_number = 1
     AND season_id = (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1)),
  'rv_future_game',
  now() + interval '2 days',
  (SELECT id FROM public.teams WHERE external_key = 'RV_T1'),
  (SELECT id FROM public.teams WHERE external_key = 'RV_T2')
)
ON CONFLICT (external_game_id) DO NOTHING;

-- Past game (kickoff HAS passed) — T3 vs T4 (distinct matchup from the future game)
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT id FROM public.weeks WHERE week_number = 1
     AND season_id = (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1)),
  'rv_past_game',
  now() - interval '2 hours',
  (SELECT id FROM public.teams WHERE external_key = 'RV_T3'),
  (SELECT id FROM public.teams WHERE external_key = 'RV_T4')
)
ON CONFLICT (external_game_id) DO NOTHING;

-- Seed Player B's pick for the FUTURE game (group 1) — T1 is home
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
VALUES (
  '00000000-0000-4000-8000-000000000a12',
  tests.get_supabase_uid('reveal_player_b'),
  (SELECT id FROM public.games WHERE external_game_id = 'rv_future_game'),
  (SELECT id FROM public.teams WHERE external_key = 'RV_T1'),
  'M',
  now() - interval '1 hour',
  (SELECT id FROM public.teams WHERE external_key = 'RV_T1'),
  -3.5,
  tests.get_supabase_uid('reveal_player_b')
);

-- Seed Player B's pick for the PAST game (group 1) — T3 is home
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
VALUES (
  '00000000-0000-4000-8000-000000000a12',
  tests.get_supabase_uid('reveal_player_b'),
  (SELECT id FROM public.games WHERE external_game_id = 'rv_past_game'),
  (SELECT id FROM public.teams WHERE external_key = 'RV_T4'),
  'H',
  now() - interval '3 hours',
  (SELECT id FROM public.teams WHERE external_key = 'RV_T3'),
  -3.5,
  tests.get_supabase_uid('reveal_player_b')
);

-- Seed Player C's pick for the PAST game (group 2 — cross-group) — T3 is home
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
VALUES (
  '00000000-0000-4000-8000-000000000b12',
  tests.get_supabase_uid('reveal_player_c'),
  (SELECT id FROM public.games WHERE external_game_id = 'rv_past_game'),
  (SELECT id FROM public.teams WHERE external_key = 'RV_T3'),
  'L',
  now() - interval '3 hours',
  (SELECT id FROM public.teams WHERE external_key = 'RV_T3'),
  -3.5,
  tests.get_supabase_uid('reveal_player_c')
);

-- === Tests as Player A (member of group 1) ===
SELECT tests.authenticate_as('reveal_player_a');

-- (1) Player A cannot read Player B's pick for the future (pre-kickoff) game
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks
     WHERE group_id = '00000000-0000-4000-8000-000000000a12'
       AND user_id = tests.get_supabase_uid('reveal_player_b')
       AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'rv_future_game') $$,
  $$ VALUES (0::bigint) $$,
  'pre-kickoff: group member cannot read another member''s pick'
);

-- (2) Player A CAN read Player B's pick for the past (post-kickoff) game
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks
     WHERE group_id = '00000000-0000-4000-8000-000000000a12'
       AND user_id = tests.get_supabase_uid('reveal_player_b')
       AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'rv_past_game') $$,
  $$ VALUES (1::bigint) $$,
  'post-kickoff: group member can read another member''s pick'
);

-- (3) Player A cannot read Player C's pick from group 2 (cross-group, even post-kickoff)
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks
     WHERE group_id = '00000000-0000-4000-8000-000000000b12'
       AND user_id = tests.get_supabase_uid('reveal_player_c') $$,
  $$ VALUES (0::bigint) $$,
  'cross-group: pick from another group is never visible regardless of kickoff'
);

-- (4) picks_group_view shows only post-kickoff picks and excludes cross-group
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_group_view
     WHERE group_id = '00000000-0000-4000-8000-000000000a12' $$,
  $$ VALUES (1::bigint) $$,
  'picks_group_view: shows exactly the one started-game pick within own group'
);

SELECT * FROM finish();
ROLLBACK;
