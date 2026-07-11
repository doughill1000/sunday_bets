-- 049_stats_situational_season.sql
-- pgTAP tests for the SEASON-grained situational views (issue #514), the /stats explorer's
-- season lens:
--   stats_situational_splits_season      -- per-user per-season splits over stats_situational_base
--   league_situational_baseline_season   -- per-season market baseline over league_ats_base
--
-- Both partition by season what their career siblings pool. The bucket CLASSIFICATION (primetime
-- slot via ET, spread magnitude, divisional) is the exact same SQL hand-checked per game in 047
-- (per-user) and 042/048 (league), so this suite tests the NEW behaviour -- the season partition --
-- via two axes:
--   * a self-contained two-season fixture (owns NFL 2076 + 2077) with hand-checked per-season rows;
--   * partitioning IDENTITIES that hold for ANY data: the season rows summed back over all seasons
--     must equal the career view exactly (so the season split can never silently disagree with the
--     shipped career one). Season 2076/2077 are private to this fixture, so the per-season count
--     assertions are safe even on a seeded local DB (the seed clones real 2022-25 seasons only).
--
-- Tests: 1-2 structure, 3-8 grants (service_role only -- ADR-0013), 9-10 per-season splits
-- (hand-checked), 11 splits sum to career, 12 cross-group isolation, 13-16 per-season baseline
-- (dims present, symmetric-cut invariant, home/away mirror, derived columns), 17 baseline sums to
-- career, 18 bucket labels valid. Runs in its own BEGIN/ROLLBACK.

BEGIN;

SELECT plan(18);

-- ── 1-2: Structure ────────────────────────────────────────────────────────────
SELECT has_view('public', 'stats_situational_splits_season',
  '1. stats_situational_splits_season is a view');
SELECT has_view('public', 'league_situational_baseline_season',
  '2. league_situational_baseline_season is a view');

-- ── 3-8: Grants (service_role only; matview-derived, no RLS -- ADR-0013) ─────────
SELECT ok(has_table_privilege('service_role', 'public.stats_situational_splits_season', 'select'),
  '3. service_role can SELECT stats_situational_splits_season');
SELECT ok(NOT has_table_privilege('anon', 'public.stats_situational_splits_season', 'select'),
  '4. anon cannot SELECT stats_situational_splits_season');
SELECT ok(NOT has_table_privilege('authenticated', 'public.stats_situational_splits_season', 'select'),
  '5. authenticated cannot SELECT stats_situational_splits_season');
SELECT ok(has_table_privilege('service_role', 'public.league_situational_baseline_season', 'select'),
  '6. service_role can SELECT league_situational_baseline_season');
SELECT ok(NOT has_table_privilege('anon', 'public.league_situational_baseline_season', 'select'),
  '7. anon cannot SELECT league_situational_baseline_season');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_situational_baseline_season', 'select'),
  '8. authenticated cannot SELECT league_situational_baseline_season');

-- ── Groups / users (049_ namespace) ─────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000004901', 'Season Situational Group A (049)'),
    ('00000000-0000-4000-8000-000000004902', 'Season Situational Group B (049)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('sit2_alice');
SELECT tests.create_supabase_user('sit2_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('sit2_alice'), 'player', 'SIT2 Alice'),
  (tests.get_supabase_uid('sit2_carol'), 'player', 'SIT2 Carol')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000004901', tests.get_supabase_uid('sit2_alice'), 'member'),
  ('00000000-0000-4000-8000-000000004902', tests.get_supabase_uid('sit2_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ── Two seasons (2076, 2077), scoring week 1 each ───────────────────────────────
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2076), ('NFL', 2077)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
SELECT s.id, 1, (y || '-09-10 00:00:00+00')::timestamptz, (y || '-09-17 00:00:00+00')::timestamptz, true
FROM (VALUES (2076), (2077)) v(y)
JOIN public.seasons s ON s.league = 'NFL' AND s.year = v.y
ON CONFLICT (season_id, week_number) DO NOTHING;

-- ── Teams: divisions set so is_divisional classifies; S2_UNK stays NULL ──────────
INSERT INTO public.teams (external_key, name, short_name, division, conference) VALUES
  ('S2_AE1', 'S2 AFC East 1', 'E1', 'East', 'AFC'),
  ('S2_AE2', 'S2 AFC East 2', 'E2', 'East', 'AFC'),
  ('S2_AW1', 'S2 AFC West 1', 'W1', 'West', 'AFC'),
  ('S2_AW2', 'S2 AFC West 2', 'W2', 'West', 'AFC'),
  ('S2_NW1', 'S2 NFC West 1', 'V1', 'West', 'NFC'),
  ('S2_NW2', 'S2 NFC West 2', 'V2', 'West', 'NFC'),
  ('S2_NE1', 'S2 NFC East 1', 'X1', 'East', 'NFC')
ON CONFLICT (external_key) DO UPDATE
  SET division = EXCLUDED.division, conference = EXCLUDED.conference;

-- ── Games (commence_time chosen for its ET day-of-week + hour; season year from seasons) ──
--   s76-g1: TNF night, AE1 vs AE2  -> primetime, divisional; home 28-14 (home covers -3)
--   s76-g2: Sun day,   NW1 vs AW1  -> day,       non-div;    home 28-17 (home covers -7)
--   s77-g1: Sun day,   AE1 vs AW2  -> day,       non-div;    home 24-10 (home covers -3)
--   s77-g2: SNF night, NW2 vs NE1  -> primetime, non-div;    home 21-20 (home fails -10)
INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT w.id, gk.ext, gk.ct::timestamptz, home.id, away.id, 'final', gk.fs::jsonb
FROM (VALUES
  ('s76-g1', 2076, '2024-09-20 00:15:00+00', 'S2_AE1', 'S2_AE2', '{"home":28,"away":14}'),  -- Thu 20:15 ET
  ('s76-g2', 2076, '2024-09-15 17:00:00+00', 'S2_NW1', 'S2_AW1', '{"home":28,"away":17}'),  -- Sun 13:00 ET
  ('s77-g1', 2077, '2024-09-15 17:00:00+00', 'S2_AE1', 'S2_AW2', '{"home":24,"away":10}'),  -- Sun 13:00 ET
  ('s77-g2', 2077, '2024-09-16 00:20:00+00', 'S2_NW2', 'S2_NE1', '{"home":21,"away":20}')   -- Sun 20:20 ET
) gk(ext, season_year, ct, home_key, away_key, fs)
JOIN public.seasons s ON s.league = 'NFL' AND s.year = gk.season_year
JOIN public.weeks w ON w.season_id = s.id AND w.week_number = 1
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- Closing lines (drive league_ats_base): home side favored by the stated magnitude.
INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', st.id, ln.sv, true, true, '2024-09-14 17:00:00+00'
FROM (VALUES
  ('s76-g1', 'S2_AE1', -3), ('s76-g2', 'S2_NW1', -7),
  ('s77-g1', 'S2_AE1', -3), ('s77-g2', 'S2_NW2', -10)
) ln(ext, spread_key, sv)
JOIN public.games g ON g.external_game_id = ln.ext
JOIN public.teams st ON st.external_key = ln.spread_key;

-- ── Picks (line at pick time = locked_spread_*) ─────────────────────────────────
-- Alice (group A): 2076 backs home AE1 (-3, WIN) + away AW1 (+7, LOSS); 2077 backs home AE1 (-3, WIN).
-- Carol (group B): 2076 backs home AE1 (-3, WIN) -- for the cross-group isolation check.
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id, p.user_id, g.id, pick.id, 'M'::public.weight_enum,
  g.commence_time - interval '1 hour', spread.id, p.spread_value, p.user_id
FROM (VALUES
  ('00000000-0000-4000-8000-000000004901'::uuid, tests.get_supabase_uid('sit2_alice'), 's76-g1', 'S2_AE1', 'S2_AE1', -3.0),
  ('00000000-0000-4000-8000-000000004901'::uuid, tests.get_supabase_uid('sit2_alice'), 's76-g2', 'S2_AW1', 'S2_AW1',  7.0),
  ('00000000-0000-4000-8000-000000004901'::uuid, tests.get_supabase_uid('sit2_alice'), 's77-g1', 'S2_AE1', 'S2_AE1', -3.0),
  ('00000000-0000-4000-8000-000000004902'::uuid, tests.get_supabase_uid('sit2_carol'), 's76-g1', 'S2_AE1', 'S2_AE1', -3.0)
) p(group_id, user_id, game_key, picked_key, spread_key, spread_value)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams pick ON pick.external_key = p.picked_key
JOIN public.teams spread ON spread.external_key = p.spread_key
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT s.group_id, p.user_id, p.game_id, p.id, s.points_delta, s.outcome::public.pick_outcome,
       '2024-09-16 00:00:00+00'
FROM (VALUES
  ('00000000-0000-4000-8000-000000004901'::uuid, tests.get_supabase_uid('sit2_alice'), 's76-g1',  1, 'win'),
  ('00000000-0000-4000-8000-000000004901'::uuid, tests.get_supabase_uid('sit2_alice'), 's76-g2', -1, 'loss'),
  ('00000000-0000-4000-8000-000000004901'::uuid, tests.get_supabase_uid('sit2_alice'), 's77-g1',  1, 'win'),
  ('00000000-0000-4000-8000-000000004902'::uuid, tests.get_supabase_uid('sit2_carol'), 's76-g1',  1, 'win')
) s(group_id, user_id, game_key, points_delta, outcome)
JOIN public.games g ON g.external_game_id = s.game_key
JOIN public.picks p ON p.group_id = s.group_id AND p.user_id = s.user_id AND p.game_id = g.id
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta, outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Refresh so stats_situational_base + league_ats_base pick up the fixture.
SELECT public.refresh_leaderboard_stats();

-- ── 9-10: Per-season splits, hand-checked (Alice, group A) ───────────────────────
SELECT results_eq(
  $$ SELECT bucket, decisions, wins, losses, pushes
     FROM public.stats_situational_splits_season
     WHERE group_id = '00000000-0000-4000-8000-000000004901'
       AND user_id = tests.get_supabase_uid('sit2_alice')
       AND season_year = 2076 AND dimension = 'primetime'
     ORDER BY bucket_order $$,
  $$ VALUES ('primetime', 1, 1, 0, 0), ('day', 1, 0, 1, 0) $$,
  '9. 2076 primetime split: 1-0 primetime (g1), 0-1 day (g2)');

SELECT results_eq(
  $$ SELECT bucket, decisions, wins, losses, pushes
     FROM public.stats_situational_splits_season
     WHERE group_id = '00000000-0000-4000-8000-000000004901'
       AND user_id = tests.get_supabase_uid('sit2_alice')
       AND season_year = 2077 AND dimension = 'primetime'
     ORDER BY bucket_order $$,
  $$ VALUES ('day', 1, 1, 0, 0) $$,
  '10. 2077 primetime split: only the day bucket (g1), 1-0');

-- ── 11: season splits sum back to the career view exactly (partition identity) ────
SELECT results_eq(
  $$ SELECT dimension, bucket, sum(wins)::int, sum(losses)::int, sum(pushes)::int
     FROM public.stats_situational_splits_season
     WHERE group_id = '00000000-0000-4000-8000-000000004901'
       AND user_id = tests.get_supabase_uid('sit2_alice')
     GROUP BY dimension, bucket
     ORDER BY dimension, bucket $$,
  $$ SELECT dimension, bucket, wins, losses, pushes
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004901'
       AND user_id = tests.get_supabase_uid('sit2_alice')
     ORDER BY dimension, bucket $$,
  '11. season splits summed over seasons equal the career splits (per dimension/bucket)');

-- ── 12: cross-group isolation ────────────────────────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.stats_situational_splits_season
    WHERE group_id = '00000000-0000-4000-8000-000000004901'
      AND user_id = tests.get_supabase_uid('sit2_carol')),
  0,
  '12. Carol (group B) does not appear in group A season splits');

-- ── 13-16: Per-season baseline (season 2076 is private to this fixture) ───────────
SELECT is(
  (SELECT count(DISTINCT dimension)::int FROM public.league_situational_baseline_season
    WHERE season_year = 2076),
  4,
  '13. 2076 baseline has all four dimensions');

SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline_season
    WHERE season_year = 2076
      AND dimension IN ('primetime', 'spread', 'divisional') AND wins <> losses),
  0,
  '14. 2076 symmetric cuts are balanced (side-grain: wins = losses)');

SELECT results_eq(
  $$ SELECT h.wins - a.losses, h.losses - a.wins, h.pushes - a.pushes
       FROM (SELECT * FROM public.league_situational_baseline_season
              WHERE season_year = 2076 AND dimension = 'home_away' AND bucket = 'home') h,
            (SELECT * FROM public.league_situational_baseline_season
              WHERE season_year = 2076 AND dimension = 'home_away' AND bucket = 'away') a $$,
  $$ VALUES (0, 0, 0) $$,
  '15. 2076 home/away mirror: home.wins = away.losses, home.losses = away.wins, equal pushes');

SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline_season
    WHERE season_year = 2076 AND decisions <> wins + losses + pushes),
  0,
  '16. 2076 baseline: decisions = wins + losses + pushes for every row');

-- ── 17: season baseline sums to the career baseline (global partition identity) ───
SELECT results_eq(
  $$ SELECT dimension, bucket, sum(wins)::int, sum(losses)::int, sum(pushes)::int
     FROM public.league_situational_baseline_season
     GROUP BY dimension, bucket
     ORDER BY dimension, bucket $$,
  $$ SELECT dimension, bucket, wins, losses, pushes
     FROM public.league_situational_baseline
     ORDER BY dimension, bucket $$,
  '17. season baseline summed over seasons equals the career baseline (per dimension/bucket)');

-- ── 18: every bucket label is valid for its dimension (both season views) ─────────
SELECT is(
  (SELECT count(*)::int FROM (
     SELECT dimension, bucket FROM public.stats_situational_splits_season
     UNION ALL
     SELECT dimension, bucket FROM public.league_situational_baseline_season
   ) r
   WHERE (dimension = 'home_away' AND bucket NOT IN ('home', 'away'))
      OR (dimension = 'primetime' AND bucket NOT IN ('primetime', 'day'))
      OR (dimension = 'spread' AND bucket NOT IN ('pickem', '1-3', '3.5-6.5', '7-9.5', '10+'))
      OR (dimension = 'divisional' AND bucket NOT IN ('divisional', 'non_divisional'))),
  0,
  '18. every bucket label is valid for its dimension (both season views)');

SELECT * FROM finish();
ROLLBACK;
