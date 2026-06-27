-- 011_backfill_parity.sql
-- pgTAP parity assertions for the original group backfill (issue #101).
-- Verifies the original group and config exist, then proves that season and
-- weekly leaderboard views filtered by the original group return byte-identical
-- results to an equivalent direct aggregation over the same pick_settlement rows.

BEGIN;

SELECT plan(10);

-- ── Original group and config exist ──────────────────────────────────────────

SELECT results_eq(
  $$ SELECT count(*) FROM public.groups
     WHERE id = '00000000-0000-4000-8000-000000000017' $$,
  $$ VALUES (1::bigint) $$,
  'original Sunday Bets group exists with stable UUID'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_config
     WHERE group_id = '00000000-0000-4000-8000-000000000017' $$,
  $$ VALUES (1::bigint) $$,
  'group_config row seeded for original group'
);

SELECT results_eq(
  $$ SELECT line_source FROM public.group_config
     WHERE group_id = '00000000-0000-4000-8000-000000000017' $$,
  $$ VALUES ('fanduel'::text) $$,
  'original group config line_source is fanduel'
);

SELECT results_eq(
  $$ SELECT scoring_rules ? 'missed_pick_penalty'
     FROM public.group_config
     WHERE group_id = '00000000-0000-4000-8000-000000000017' $$,
  $$ VALUES (true) $$,
  'original group config scoring_rules carries missed_pick_penalty key'
);

-- ── Parity seed: two players, two weeks, two graded games ────────────────────

SELECT tests.create_supabase_user('parity_alice');
SELECT tests.create_supabase_user('parity_bob');

INSERT INTO public.users (id, role, display_name) VALUES
  (tests.get_supabase_uid('parity_alice'), 'player', 'Parity Alice'),
  (tests.get_supabase_uid('parity_bob'),   'player', 'Parity Bob')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.group_memberships (group_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000000017', tests.get_supabase_uid('parity_alice'), 'member'),
  ('00000000-0000-4000-8000-000000000017', tests.get_supabase_uid('parity_bob'),   'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.seasons (year) VALUES (2031)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1),
  1,
  now() - interval '14 days',
  now() - interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2031 LIMIT 1),
  2,
  now() - interval '7 days',
  now() - interval '1 day'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('PARITY_HOME', 'Parity Home Team', 'PHT'),
  ('PARITY_AWAY', 'Parity Away Team', 'PAT')
ON CONFLICT (external_key) DO NOTHING;

INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT w.id FROM public.weeks w
   JOIN public.seasons s ON s.id = w.season_id
   WHERE s.year = 2031 AND w.week_number = 1),
  'parity_game_wk1',
  now() - interval '10 days',
  (SELECT id FROM public.teams WHERE external_key = 'PARITY_HOME'),
  (SELECT id FROM public.teams WHERE external_key = 'PARITY_AWAY')
) ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT w.id FROM public.weeks w
   JOIN public.seasons s ON s.id = w.season_id
   WHERE s.year = 2031 AND w.week_number = 2),
  'parity_game_wk2',
  now() - interval '3 days',
  (SELECT id FROM public.teams WHERE external_key = 'PARITY_HOME'),
  (SELECT id FROM public.teams WHERE external_key = 'PARITY_AWAY')
) ON CONFLICT (external_game_id) DO NOTHING;

-- alice: +5 (win wk1), +3 (win wk2) → season total 8
-- bob:   -1 (loss wk1), -1 (missed wk2) → season total -2
INSERT INTO public.pick_settlement (group_id, user_id, game_id, points_delta, outcome)
VALUES
  (
    '00000000-0000-4000-8000-000000000017',
    tests.get_supabase_uid('parity_alice'),
    (SELECT id FROM public.games WHERE external_game_id = 'parity_game_wk1'),
    5, 'win'
  ),
  (
    '00000000-0000-4000-8000-000000000017',
    tests.get_supabase_uid('parity_bob'),
    (SELECT id FROM public.games WHERE external_game_id = 'parity_game_wk1'),
    -1, 'loss'
  ),
  (
    '00000000-0000-4000-8000-000000000017',
    tests.get_supabase_uid('parity_alice'),
    (SELECT id FROM public.games WHERE external_game_id = 'parity_game_wk2'),
    3, 'win'
  ),
  (
    '00000000-0000-4000-8000-000000000017',
    tests.get_supabase_uid('parity_bob'),
    (SELECT id FROM public.games WHERE external_game_id = 'parity_game_wk2'),
    -1, 'missed'
  );

-- leaderboard_season_totals is materialized (issue #191): refresh so the settlements
-- above are visible. leaderboard_weekly_cumulative below is still a plain view.
SELECT public.refresh_leaderboard_stats();

-- ── Season parity ─────────────────────────────────────────────────────────────

SELECT results_eq(
  $$ SELECT user_id, total_points
     FROM public.leaderboard_season_totals
     WHERE group_id = '00000000-0000-4000-8000-000000000017'
       AND season_year = 2031
     ORDER BY user_id $$,
  $$ SELECT ps.user_id, sum(ps.points_delta)::int
     FROM public.pick_settlement ps
     JOIN public.games  g ON g.id = ps.game_id
     JOIN public.weeks  w ON w.id = g.week_id
     JOIN public.seasons s ON s.id = w.season_id
     WHERE ps.group_id = '00000000-0000-4000-8000-000000000017'
       AND s.year = 2031
     GROUP BY ps.user_id
     ORDER BY ps.user_id $$,
  'season totals via view match direct aggregation (season parity)'
);

SELECT results_eq(
  $$ SELECT total_points
     FROM public.leaderboard_season_totals
     WHERE group_id = '00000000-0000-4000-8000-000000000017'
       AND season_year = 2031
       AND user_id = tests.get_supabase_uid('parity_alice') $$,
  $$ VALUES (8::int) $$,
  'alice season total is 8 (5 + 3)'
);

SELECT results_eq(
  $$ SELECT total_points
     FROM public.leaderboard_season_totals
     WHERE group_id = '00000000-0000-4000-8000-000000000017'
       AND season_year = 2031
       AND user_id = tests.get_supabase_uid('parity_bob') $$,
  $$ VALUES (-2::int) $$,
  'bob season total is -2 (-1 + -1)'
);

-- ── Weekly parity ─────────────────────────────────────────────────────────────

SELECT results_eq(
  $$ SELECT user_id, week_number, week_points
     FROM public.leaderboard_weekly_cumulative
     WHERE group_id = '00000000-0000-4000-8000-000000000017'
       AND season_year = 2031
     ORDER BY user_id, week_number $$,
  $$ SELECT ps.user_id, w.week_number, sum(ps.points_delta)::int
     FROM public.pick_settlement ps
     JOIN public.games  g ON g.id = ps.game_id
     JOIN public.weeks  w ON w.id = g.week_id
     JOIN public.seasons s ON s.id = w.season_id
     WHERE ps.group_id = '00000000-0000-4000-8000-000000000017'
       AND s.year = 2031
     GROUP BY ps.user_id, w.week_number
     ORDER BY ps.user_id, w.week_number $$,
  'weekly points via view match direct aggregation (weekly parity)'
);

SELECT results_eq(
  $$ SELECT week_number, cumulative_points
     FROM public.leaderboard_weekly_cumulative
     WHERE group_id = '00000000-0000-4000-8000-000000000017'
       AND season_year = 2031
       AND user_id = tests.get_supabase_uid('parity_alice')
     ORDER BY week_number $$,
  $$ VALUES (1, 5::int), (2, 8::int) $$,
  'alice cumulative: 5 after week 1, 8 after week 2'
);

SELECT results_eq(
  $$ SELECT week_number, cumulative_rank_this_week
     FROM public.leaderboard_weekly_cumulative
     WHERE group_id = '00000000-0000-4000-8000-000000000017'
       AND season_year = 2031
       AND user_id = tests.get_supabase_uid('parity_alice')
     ORDER BY week_number $$,
  $$ VALUES (1, 1::bigint), (2, 1::bigint) $$,
  'alice ranked #1 in both weeks (season parity validated via rank)'
);

SELECT * FROM finish();
ROLLBACK;
