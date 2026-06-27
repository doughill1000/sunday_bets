-- 015_cross_group_stats_isolation.sql
-- pgTAP tests proving that stats/leaderboard views respect group_id isolation.
--
-- Two groups share one user and one game but have DIVERGENT settled outcomes:
--   Group A: all members picked home (winner) → 'win' settlements
--   Group B: all members picked away (loser)  → 'loss' settlements
--
-- The shared user exists in BOTH groups; exclusive-A only in group A;
-- exclusive-B only in group B.
--
-- This suite owns season year 2098, week 5 to avoid colliding with other test
-- files (007 uses 2040, 013 uses 2041, 004 uses 2025, seedTwoGroupSettlements
-- owns 2099/week 10).

BEGIN;

SELECT plan(22);

-- ── Stable UUIDs for this file ───────────────────────────────────────────────

-- Groups
-- (use the 015_ namespace to avoid any collision with other test files)
DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-0000000015a1', 'ISO Test Group A (015)'),
    ('00000000-0000-4000-8000-0000000015b2', 'ISO Test Group B (015)')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Players
SELECT tests.create_supabase_user('iso_shared');
SELECT tests.create_supabase_user('iso_excl_a');
SELECT tests.create_supabase_user('iso_excl_b');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('iso_shared'), 'player', 'ISO Shared'),
  (tests.get_supabase_uid('iso_excl_a'), 'player', 'ISO Excl A'),
  (tests.get_supabase_uid('iso_excl_b'), 'player', 'ISO Excl B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Memberships: shared belongs to both; exclusive users each in one only.
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-0000000015a1', tests.get_supabase_uid('iso_shared'), 'member'),
  ('00000000-0000-4000-8000-0000000015a1', tests.get_supabase_uid('iso_excl_a'), 'member'),
  ('00000000-0000-4000-8000-0000000015b2', tests.get_supabase_uid('iso_shared'), 'member'),
  ('00000000-0000-4000-8000-0000000015b2', tests.get_supabase_uid('iso_excl_b'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season / Week (year 2098, week 5 — exclusive to this file)
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2098)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098),
  5,
  '2098-09-01 00:00:00+00',
  '2098-09-08 00:00:00+00'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams (ISO-prefixed external_keys to avoid collisions)
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('ISO_HOME', 'ISO Home Team', 'IHT'),
  ('ISO_AWAY', 'ISO Away Team', 'IAT')
ON CONFLICT (external_key) DO NOTHING;

-- Game: home wins 30-10 → home covers any spread.
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id,
  'iso-015-game-1',
  '2098-09-05 18:00:00+00',
  home.id,
  away.id,
  'final',
  '{"home": 30, "away": 10}'::jsonb
FROM public.weeks  w
JOIN public.teams  home ON home.external_key = 'ISO_HOME'
JOIN public.teams  away ON away.external_key = 'ISO_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098)
  AND w.week_number = 5
ON CONFLICT (external_game_id) DO NOTHING;

-- Active line: home team favoured by -6.5 (home covers)
INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line)
SELECT
  g.id,
  'fanduel',
  home.id,
  -6.5,
  true
FROM public.games g
JOIN public.teams home ON home.external_key = 'ISO_HOME'
WHERE g.external_game_id = 'iso-015-game-1'
ON CONFLICT DO NOTHING;

-- ── Picks ─────────────────────────────────────────────────────────────────────
--
-- Group A: shared + excl-A → pick home (winner)
-- Group B: shared + excl-B → pick away (loser)

INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id,
  weight, locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id,
  p.user_id,
  g.id,
  team.id,
  'M'::public.weight_enum,
  g.commence_time - interval '1 hour',
  home.id,
  6.5,
  p.user_id
FROM (
  VALUES
    ('00000000-0000-4000-8000-0000000015a1'::uuid, tests.get_supabase_uid('iso_shared'), 'ISO_HOME'),
    ('00000000-0000-4000-8000-0000000015a1'::uuid, tests.get_supabase_uid('iso_excl_a'), 'ISO_HOME'),
    ('00000000-0000-4000-8000-0000000015b2'::uuid, tests.get_supabase_uid('iso_shared'), 'ISO_AWAY'),
    ('00000000-0000-4000-8000-0000000015b2'::uuid, tests.get_supabase_uid('iso_excl_b'), 'ISO_AWAY')
) p(group_id, user_id, team_key)
JOIN public.games g  ON g.external_game_id = 'iso-015-game-1'
JOIN public.teams team ON team.external_key = p.team_key
JOIN public.teams home ON home.external_key = 'ISO_HOME'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ───────────────────────────────────────────────────────────────
--
-- Insert directly (mirrors grade_game outcome for clarity).

INSERT INTO public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
SELECT
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  CASE p.group_id
    WHEN '00000000-0000-4000-8000-0000000015a1' THEN  3   -- group A win
    ELSE                                               -3  -- group B loss
  END,
  CASE p.group_id
    WHEN '00000000-0000-4000-8000-0000000015a1' THEN 'win'::public.pick_outcome
    ELSE                                              'loss'::public.pick_outcome
  END,
  '2098-09-05 22:00:00+00'
FROM public.picks p
WHERE p.game_id = (SELECT id FROM public.games WHERE external_game_id = 'iso-015-game-1')
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta,
      outcome      = EXCLUDED.outcome,
      graded_at    = EXCLUDED.graded_at;

-- leaderboard_season_totals and the stats_* views are materialized (issue #191):
-- refresh so the settlements above are visible to every assertion below.
SELECT public.refresh_leaderboard_stats();

-- ── Assertions: leaderboard_season_totals ─────────────────────────────────────

-- 1. Group A leaderboard contains shared and excl-A, NOT excl-B.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.leaderboard_season_totals
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id IN (
        tests.get_supabase_uid('iso_shared'),
        tests.get_supabase_uid('iso_excl_a')
      )
  $$,
  $$ VALUES (2) $$,
  'leaderboard_season_totals: group A contains shared + excl-A (2 rows)'
);

-- 2. Group A leaderboard must NOT contain excl-B.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.leaderboard_season_totals
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_excl_b')
  $$,
  $$ VALUES (0) $$,
  'leaderboard_season_totals: group A must not expose group B exclusive member'
);

-- 3. Group B leaderboard contains shared and excl-B, NOT excl-A.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.leaderboard_season_totals
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id IN (
        tests.get_supabase_uid('iso_shared'),
        tests.get_supabase_uid('iso_excl_b')
      )
  $$,
  $$ VALUES (2) $$,
  'leaderboard_season_totals: group B contains shared + excl-B (2 rows)'
);

-- 4. Group B leaderboard must NOT contain excl-A.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.leaderboard_season_totals
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_excl_a')
  $$,
  $$ VALUES (0) $$,
  'leaderboard_season_totals: group B must not expose group A exclusive member'
);

-- 5. Shared user: group A shows 1 win.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.leaderboard_season_totals
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_shared')
  $$,
  $$ VALUES (1, 0) $$,
  'leaderboard_season_totals: shared user has 1 win in group A'
);

-- 6. Shared user: group B shows 1 loss.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.leaderboard_season_totals
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_shared')
  $$,
  $$ VALUES (0, 1) $$,
  'leaderboard_season_totals: shared user has 1 loss in group B'
);

-- ── Assertions: stats_season_trend ───────────────────────────────────────────

-- 7. Group A trend for shared user: positive cumulative points.
SELECT ok(
  (
    SELECT cumulative_points > 0
    FROM public.stats_season_trend
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_shared')
  ),
  'stats_season_trend: shared user has positive points in group A'
);

-- 8. Group B trend for shared user: negative cumulative points.
SELECT ok(
  (
    SELECT cumulative_points < 0
    FROM public.stats_season_trend
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_shared')
  ),
  'stats_season_trend: shared user has negative points in group B'
);

-- 9. Group A trend must NOT contain excl-B.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_season_trend
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_excl_b')
  $$,
  $$ VALUES (0) $$,
  'stats_season_trend: group A does not expose group B exclusive member'
);

-- 10. Group B trend must NOT contain excl-A.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_season_trend
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_excl_a')
  $$,
  $$ VALUES (0) $$,
  'stats_season_trend: group B does not expose group A exclusive member'
);

-- ── Assertions: stats_accuracy_by_team ───────────────────────────────────────

-- 11. Group A team accuracy: shared user should have 1 win on the home team.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.stats_accuracy_by_team
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_shared')
      AND team_short_name = 'IHT'
  $$,
  $$ VALUES (1, 0) $$,
  'stats_accuracy_by_team: shared user wins on home team in group A'
);

-- 12. Group B team accuracy: shared user should have 1 loss on the away team.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.stats_accuracy_by_team
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_shared')
      AND team_short_name = 'IAT'
  $$,
  $$ VALUES (0, 1) $$,
  'stats_accuracy_by_team: shared user loses on away team in group B'
);

-- 13. Group A team accuracy must NOT include excl-B.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_accuracy_by_team
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_excl_b')
  $$,
  $$ VALUES (0) $$,
  'stats_accuracy_by_team: group A does not expose group B exclusive member'
);

-- 14. Group B team accuracy must NOT include excl-A.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_accuracy_by_team
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_excl_a')
  $$,
  $$ VALUES (0) $$,
  'stats_accuracy_by_team: group B does not expose group A exclusive member'
);

-- ── Assertions: stats_accuracy_by_weight ─────────────────────────────────────

-- 15. Group A weight accuracy for 'M': shared user wins.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.stats_accuracy_by_weight
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_shared')
      AND weight = 'M'
  $$,
  $$ VALUES (1, 0) $$,
  'stats_accuracy_by_weight: shared user wins weight M in group A'
);

-- 16. Group B weight accuracy for 'M': shared user loses.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.stats_accuracy_by_weight
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_shared')
      AND weight = 'M'
  $$,
  $$ VALUES (0, 1) $$,
  'stats_accuracy_by_weight: shared user loses weight M in group B'
);

-- ── Assertions: stats_head_to_head ───────────────────────────────────────────

-- 17. Group A H2H: excl-B must never appear as user_id or opponent.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_head_to_head
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015a1'
      AND (user_id = tests.get_supabase_uid('iso_excl_b')
           OR opponent_user_id = tests.get_supabase_uid('iso_excl_b'))
  $$,
  $$ VALUES (0) $$,
  'stats_head_to_head: group A H2H does not expose group B exclusive member'
);

-- 18. Group B H2H: excl-A must never appear as user_id or opponent.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_head_to_head
    WHERE season_year = 2098
      AND group_id = '00000000-0000-4000-8000-0000000015b2'
      AND (user_id = tests.get_supabase_uid('iso_excl_a')
           OR opponent_user_id = tests.get_supabase_uid('iso_excl_a'))
  $$,
  $$ VALUES (0) $$,
  'stats_head_to_head: group B H2H does not expose group A exclusive member'
);

-- ── Assertions: stats_alltime_totals ─────────────────────────────────────────

-- 19. Group A alltime totals: shared user shows 1 win.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.stats_alltime_totals
    WHERE group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_shared')
  $$,
  $$ VALUES (1, 0) $$,
  'stats_alltime_totals: shared user has 1 win in group A'
);

-- 20. Group B alltime totals: shared user shows 1 loss.
SELECT results_eq(
  $$
    SELECT wins, losses
    FROM public.stats_alltime_totals
    WHERE group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_shared')
  $$,
  $$ VALUES (0, 1) $$,
  'stats_alltime_totals: shared user has 1 loss in group B'
);

-- 21. Group A alltime totals: excl-B must not appear.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_alltime_totals
    WHERE group_id = '00000000-0000-4000-8000-0000000015a1'
      AND user_id = tests.get_supabase_uid('iso_excl_b')
  $$,
  $$ VALUES (0) $$,
  'stats_alltime_totals: group A must not expose group B exclusive member'
);

-- 22. Group B alltime totals: excl-A must not appear.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_alltime_totals
    WHERE group_id = '00000000-0000-4000-8000-0000000015b2'
      AND user_id = tests.get_supabase_uid('iso_excl_a')
  $$,
  $$ VALUES (0) $$,
  'stats_alltime_totals: group B must not expose group A exclusive member'
);

SELECT * FROM finish();
ROLLBACK;
