-- 031_stats_accuracy_by_line_side.sql
-- pgTAP tests for the stats_accuracy_by_line_side materialized view (issue #317).
--
-- Tests:
--   1. Matview exists and is materialized.
--   2. Unique index exists (required for REFRESH ... CONCURRENTLY).
--   3. service_role can SELECT; anon/authenticated cannot.
--   4. Favorite (chalk) vs underdog (dog) is read off the locked line at pick time, for
--      either side of the matchup (home-favored and away-favored games both covered).
--   5. Pick'em games (locked_spread_value = 0) count in `decisions` but are neither chalk
--      nor dog.
--   6. Non-scoring rounds are excluded entirely.
--   7. Cross-group isolation: group B picks never appear in group A results.
--
-- This suite owns season year 2096 to avoid colliding with other test files. Each week-3
-- game uses a distinct matchup (uq_games_matchup is unique per week + team pair).

BEGIN;

SELECT plan(14);

-- ── Stable UUIDs (031_ namespace) ────────────────────────────────────────────

DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000003101', 'Line-side Test Group A (031)'),
    ('00000000-0000-4000-8000-000000003102', 'Line-side Test Group B (031)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('ls_alice');
SELECT tests.create_supabase_user('ls_bob');
SELECT tests.create_supabase_user('ls_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('ls_alice'), 'player', 'LS Alice'),
  (tests.get_supabase_uid('ls_bob'),   'player', 'LS Bob'),
  (tests.get_supabase_uid('ls_carol'), 'player', 'LS Carol')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000003101', tests.get_supabase_uid('ls_alice'), 'member'),
  ('00000000-0000-4000-8000-000000003101', tests.get_supabase_uid('ls_bob'),   'member'),
  ('00000000-0000-4000-8000-000000003102', tests.get_supabase_uid('ls_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season (2096) / week 3 (scoring) / week 4 (non-scoring)
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2096) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  (
    (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2096),
    3, '2096-09-15 00:00:00+00', '2096-09-22 00:00:00+00', true
  ),
  (
    (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2096),
    4, '2096-09-22 00:00:00+00', '2096-09-29 00:00:00+00', false  -- non-scoring round
  )
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams: a distinct home/away pair per week-3 game (uq_games_matchup is per week).
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('LS_A_HOME', 'LS A Home', 'LAH'),
  ('LS_A_AWAY', 'LS A Away', 'LAA'),
  ('LS_B_HOME', 'LS B Home', 'LBH'),
  ('LS_B_AWAY', 'LS B Away', 'LBA'),
  ('LS_C_HOME', 'LS C Home', 'LCH'),
  ('LS_C_AWAY', 'LS C Away', 'LCA')
ON CONFLICT (external_key) DO NOTHING;

-- Games:
--   ls-game-a (wk3): A_HOME favored
--   ls-game-b (wk3): B_AWAY favored
--   ls-game-c (wk3): pick'em (C matchup)
--   ls-game-d (wk4, non-scoring): A_HOME favored (reuses A pair; different week) — excluded
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id, gk.external_game_id, '2096-09-17 18:00:00+00',
  home.id, away.id, 'final', '{"home": 21, "away": 17}'::jsonb
FROM (VALUES
  ('ls-game-a', 3, 'LS_A_HOME', 'LS_A_AWAY'),
  ('ls-game-b', 3, 'LS_B_HOME', 'LS_B_AWAY'),
  ('ls-game-c', 3, 'LS_C_HOME', 'LS_C_AWAY'),
  ('ls-game-d', 4, 'LS_A_HOME', 'LS_A_AWAY')
) gk(external_game_id, week_number, home_key, away_key)
JOIN public.weeks w
  ON w.week_number = gk.week_number
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2096)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- ── Picks ─────────────────────────────────────────────────────────────────────
-- Each row carries its own locked line (spread team + value), mirroring the line at
-- pick time. Negative spread_value means the spread_team is the favorite.
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id,
  weight, locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id,
  p.user_id,
  g.id,
  pick.id,
  'M'::public.weight_enum,
  g.commence_time - interval '1 hour',
  spread.id,
  p.spread_value,
  p.user_id
FROM (VALUES
  -- Group A — Alice: home-fav→home (chalk), away-fav→away (chalk), pick'em→home (neither)
  ('00000000-0000-4000-8000-000000003101'::uuid, tests.get_supabase_uid('ls_alice'), 'ls-game-a', 'LS_A_HOME', 'LS_A_HOME', -3.5),
  ('00000000-0000-4000-8000-000000003101'::uuid, tests.get_supabase_uid('ls_alice'), 'ls-game-b', 'LS_B_AWAY', 'LS_B_AWAY', -2.5),
  ('00000000-0000-4000-8000-000000003101'::uuid, tests.get_supabase_uid('ls_alice'), 'ls-game-c', 'LS_C_HOME', 'LS_C_HOME',  0.0),
  -- Group A — Bob: home-fav→away (dog), away-fav→home (dog)
  ('00000000-0000-4000-8000-000000003101'::uuid, tests.get_supabase_uid('ls_bob'),   'ls-game-a', 'LS_A_AWAY', 'LS_A_HOME', -3.5),
  ('00000000-0000-4000-8000-000000003101'::uuid, tests.get_supabase_uid('ls_bob'),   'ls-game-b', 'LS_B_HOME', 'LS_B_AWAY', -2.5),
  -- Group A — Alice non-scoring week 4 pick (chalk, but must be excluded)
  ('00000000-0000-4000-8000-000000003101'::uuid, tests.get_supabase_uid('ls_alice'), 'ls-game-d', 'LS_A_HOME', 'LS_A_HOME', -3.5),
  -- Group B — Carol: home-fav→home (chalk)
  ('00000000-0000-4000-8000-000000003102'::uuid, tests.get_supabase_uid('ls_carol'), 'ls-game-a', 'LS_A_HOME', 'LS_A_HOME', -3.5)
) p(group_id, user_id, game_key, picked_key, spread_key, spread_value)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams pick ON pick.external_key = p.picked_key
JOIN public.teams spread ON spread.external_key = p.spread_key
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ───────────────────────────────────────────────────────────────
INSERT INTO public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
SELECT
  p.group_id, p.user_id, p.game_id, p.id, 1, 'win'::public.pick_outcome, '2096-09-17 22:00:00+00'
FROM public.picks p
WHERE p.game_id IN (
  SELECT id FROM public.games
  WHERE external_game_id IN ('ls-game-a', 'ls-game-b', 'ls-game-c', 'ls-game-d')
)
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta,
      outcome      = EXCLUDED.outcome,
      graded_at    = EXCLUDED.graded_at;

-- Refresh so assertions see the new settlements.
SELECT public.refresh_leaderboard_stats();

-- ── 1–2: Structural checks ────────────────────────────────────────────────────

SELECT has_materialized_view('public', 'stats_accuracy_by_line_side',
  '1. stats_accuracy_by_line_side is a materialized view');

SELECT has_index('public', 'stats_accuracy_by_line_side', 'uq_stats_accuracy_by_line_side',
  '2. unique index exists for REFRESH ... CONCURRENTLY');

-- ── 3: Grant checks ───────────────────────────────────────────────────────────

SELECT ok(
  has_table_privilege('service_role', 'public.stats_accuracy_by_line_side', 'select'),
  '3a. service_role can SELECT stats_accuracy_by_line_side'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.stats_accuracy_by_line_side', 'select'),
  '3b. anon cannot SELECT stats_accuracy_by_line_side'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.stats_accuracy_by_line_side', 'select'),
  '3c. authenticated cannot SELECT stats_accuracy_by_line_side'
);

-- ── 4: Alice — chalk on both sides; pick'em counted in decisions only ──────────

SELECT results_eq(
  $$
    SELECT decisions, chalk_picks, dog_picks
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003101'
      AND season_year = 2096
      AND user_id = tests.get_supabase_uid('ls_alice')
  $$,
  $$ VALUES (3, 2, 0) $$,
  '4. Alice: 3 decisions (incl. pick''em), 2 chalk (home-fav home, away-fav away), 0 dog'
);

-- ── 5: Bob — dog on both sides ────────────────────────────────────────────────

SELECT results_eq(
  $$
    SELECT decisions, chalk_picks, dog_picks
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003101'
      AND season_year = 2096
      AND user_id = tests.get_supabase_uid('ls_bob')
  $$,
  $$ VALUES (2, 0, 2) $$,
  '5. Bob: 2 decisions, 0 chalk, 2 dog (took the underdog both ways)'
);

-- ── 6: Non-scoring round excluded (Alice has 3, not 4, decisions) ──────────────

SELECT results_eq(
  $$
    SELECT decisions
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003101'
      AND season_year = 2096
      AND user_id = tests.get_supabase_uid('ls_alice')
  $$,
  $$ VALUES (3) $$,
  '6. Non-scoring week-4 pick is excluded from Alice''s decisions'
);

-- ── 7: Cross-group isolation ──────────────────────────────────────────────────

SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003101'
      AND user_id = tests.get_supabase_uid('ls_carol')
  $$,
  $$ VALUES (0) $$,
  '7a. Carol (group B) does not appear in group A line-side stats'
);

SELECT results_eq(
  $$
    SELECT decisions, chalk_picks, dog_picks
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003102'
      AND season_year = 2096
      AND user_id = tests.get_supabase_uid('ls_carol')
  $$,
  $$ VALUES (1, 1, 0) $$,
  '7b. Carol (group B): 1 decision, 1 chalk, 0 dog'
);

-- ── Extra structural assertions to round out the plan ─────────────────────────

SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003101'
      AND season_year = 2096
  $$,
  $$ VALUES (2) $$,
  '8. Group A has exactly two players (Alice + Bob)'
);

SELECT results_eq(
  $$
    SELECT (chalk_picks + dog_picks) <= decisions
    FROM public.stats_accuracy_by_line_side
    WHERE group_id = '00000000-0000-4000-8000-000000003101'
      AND season_year = 2096
      AND user_id = tests.get_supabase_uid('ls_alice')
  $$,
  $$ VALUES (true) $$,
  '9. chalk + dog never exceeds decisions (pick''em sits outside both)'
);

SELECT has_column('public', 'stats_accuracy_by_line_side', 'chalk_picks',
  '10. chalk_picks column is exposed');

SELECT has_column('public', 'stats_accuracy_by_line_side', 'dog_picks',
  '11. dog_picks column is exposed');

SELECT * FROM finish();
ROLLBACK;
