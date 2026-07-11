-- 047_stats_situational.sql
-- pgTAP tests for the per-user situational ATS views (issue #502):
--   stats_situational_base   -- pick-grain classification matview
--   stats_situational_splits -- career-grain long-format aggregate the "Your edge" panel reads
--
-- Tests:
--   1-3.  Structure: base is a matview with its unique index; splits is a view.
--   4-9.  Grants: service_role can SELECT both; anon/authenticated cannot (ADR-0013).
--   10-13. Base classification per game: primetime slot (TNF/SNF night vs Sunday day, via ET),
--          the side backed (home/away), spread bucket by line-at-pick-time magnitude, and
--          divisional -- including the NULL case (a side with no division/conference).
--   14-17. Splits math for all four dimensions on a hand-checked career fixture.
--   18.    accuracy = wins / (wins + losses), pushes excluded, NULL on a no-decision bucket.
--   19.    Non-scoring rounds (ADR-0016) are excluded.
--   20-21. Cross-group isolation: group B picks never appear in group A results.
--
-- This suite owns season year 2073 to avoid colliding with other test files. commence_time
-- values are real 2024 kickoffs chosen purely for their America/New_York day-of-week + hour
-- (what the primetime slot classifies on); they are independent of the synthetic season year,
-- which comes from seasons.year via the weeks join. Each week-3 game uses a distinct matchup
-- (uq_games_matchup is unique per week + team pair).

BEGIN;

SELECT plan(21);

-- ── Groups (047_ namespace) ───────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000004701', 'Situational Test Group A (047)'),
    ('00000000-0000-4000-8000-000000004702', 'Situational Test Group B (047)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('sit_alice');
SELECT tests.create_supabase_user('sit_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('sit_alice'), 'player', 'SIT Alice'),
  (tests.get_supabase_uid('sit_carol'), 'player', 'SIT Carol')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000004701', tests.get_supabase_uid('sit_alice'), 'member'),
  ('00000000-0000-4000-8000-000000004702', tests.get_supabase_uid('sit_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ── Season (2073) / week 3 (scoring) / week 4 (non-scoring) ────────────────────
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2073) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2073),
   3, '2073-09-15 00:00:00+00', '2073-09-22 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2073),
   4, '2073-09-22 00:00:00+00', '2073-09-29 00:00:00+00', false)  -- non-scoring round
ON CONFLICT (season_id, week_number) DO NOTHING;

-- ── Teams: division/conference set so is_divisional can be classified; SIT_UNK is left
--    unclassified (NULL) on purpose to exercise the divisional-NULL exclusion. ────────────
INSERT INTO public.teams (external_key, name, short_name, division, conference) VALUES
  ('SIT_AE1', 'SIT AFC East 1', 'AE1', 'East', 'AFC'),
  ('SIT_AE2', 'SIT AFC East 2', 'AE2', 'East', 'AFC'),
  ('SIT_AE3', 'SIT AFC East 3', 'AE3', 'East', 'AFC'),
  ('SIT_AW1', 'SIT AFC West 1', 'AW1', 'West', 'AFC'),
  ('SIT_AW2', 'SIT AFC West 2', 'AW2', 'West', 'AFC'),
  ('SIT_NW1', 'SIT NFC West 1', 'NW1', 'West', 'NFC'),
  ('SIT_NW2', 'SIT NFC West 2', 'NW2', 'West', 'NFC'),
  ('SIT_NE1', 'SIT NFC East 1', 'NE1', 'East', 'NFC'),
  ('SIT_UNK', 'SIT Unclassified', 'UNK', NULL, NULL)
ON CONFLICT (external_key) DO UPDATE
  SET division = EXCLUDED.division, conference = EXCLUDED.conference;

-- ── Games ─────────────────────────────────────────────────────────────────────
--   g1 (wk3): TNF night, AFC East vs AFC East  -> primetime, divisional
--   g2 (wk3): Sun day,   NFC West vs AFC West   -> day,       non-divisional
--   g3 (wk3): SNF night, NFC West vs NFC East   -> primetime, non-divisional (same conf, diff div)
--   g4 (wk3): Sun day,   AFC East vs AFC West   -> day,       non-divisional
--   g5 (wk3): Sun day,   Unclassified vs NFC W  -> day,       is_divisional NULL (excluded)
--   g6 (wk3): Sun day,   AFC West vs NFC East   -> day,       non-divisional
--   g7 (wk4, non-scoring): Sun day              -> excluded entirely
INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id, gk.external_game_id, gk.commence_time::timestamptz,
  home.id, away.id, 'final', '{"home": 21, "away": 17}'::jsonb
FROM (VALUES
  ('sit-g1', 3, 'SIT_AE1', 'SIT_AE2', '2024-09-20 00:15:00+00'),  -- Thu 20:15 ET
  ('sit-g2', 3, 'SIT_NW1', 'SIT_AW1', '2024-09-15 17:00:00+00'),  -- Sun 13:00 ET
  ('sit-g3', 3, 'SIT_NW2', 'SIT_NE1', '2024-09-16 00:20:00+00'),  -- Sun 20:20 ET
  ('sit-g4', 3, 'SIT_AE3', 'SIT_AW2', '2024-09-15 17:00:00+00'),  -- Sun 13:00 ET
  ('sit-g5', 3, 'SIT_UNK', 'SIT_NW1', '2024-09-15 17:00:00+00'),  -- Sun 13:00 ET
  ('sit-g6', 3, 'SIT_AW2', 'SIT_NE1', '2024-09-15 17:00:00+00'),  -- Sun 13:00 ET
  ('sit-g7', 4, 'SIT_AE1', 'SIT_NW1', '2024-09-22 17:00:00+00')   -- Sun 13:00 ET, non-scoring
) gk(external_game_id, week_number, home_key, away_key, commence_time)
JOIN public.weeks w
  ON w.week_number = gk.week_number
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2073)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- ── Picks ─────────────────────────────────────────────────────────────────────
-- Each carries its own locked line (spread team + value = line at pick time). Negative value on
-- the picked team = they backed the favorite. sit-g7 is the non-scoring week-4 pick.
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id, p.user_id, g.id, pick.id, 'M'::public.weight_enum,
  g.commence_time - interval '1 hour', spread.id, p.spread_value, p.user_id
FROM (VALUES
  -- Group A — Alice (week 3, scoring)
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g1', 'SIT_AE1', 'SIT_AE1', -3.0),   -- home, primetime, div, 1-3, WIN
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g2', 'SIT_AW1', 'SIT_AW1', -7.0),   -- away, day, non-div, 7-9.5, LOSS
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g3', 'SIT_NW2', 'SIT_NW2',  6.5),   -- home, primetime, non-div, 3.5-6.5, WIN
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g4', 'SIT_AE3', 'SIT_AE3',  0.0),   -- home, day, non-div, pickem, PUSH
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g5', 'SIT_NW1', 'SIT_NW1', -10.0),  -- away, day, div NULL, 10+, WIN
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g6', 'SIT_AW2', 'SIT_AW2', -3.0),   -- home, day, non-div, 1-3, WIN
  -- Group A — Alice non-scoring week-4 pick (must be excluded)
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g7', 'SIT_AE1', 'SIT_AE1', -3.0),
  -- Group B — Carol: same g1 (primetime, home, divisional) under group B
  ('00000000-0000-4000-8000-000000004702'::uuid, tests.get_supabase_uid('sit_carol'), 'sit-g1', 'SIT_AE1', 'SIT_AE1', -3.0)
) p(group_id, user_id, game_key, picked_key, spread_key, spread_value)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams pick ON pick.external_key = p.picked_key
JOIN public.teams spread ON spread.external_key = p.spread_key
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ───────────────────────────────────────────────────────────────
-- outcome/points per the WIN/LOSS/PUSH plan above; group_id carries the tenancy dimension.
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT s.group_id, p.user_id, p.game_id, p.id, s.points_delta, s.outcome::public.pick_outcome,
       '2024-09-21 00:00:00+00'
FROM (VALUES
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g1',  1, 'win'),
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g2', -1, 'loss'),
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g3',  1, 'win'),
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g4',  0, 'push'),
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g5',  1, 'win'),
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g6',  1, 'win'),
  ('00000000-0000-4000-8000-000000004701'::uuid, tests.get_supabase_uid('sit_alice'), 'sit-g7',  1, 'win'),  -- non-scoring
  ('00000000-0000-4000-8000-000000004702'::uuid, tests.get_supabase_uid('sit_carol'), 'sit-g1',  1, 'win')
) s(group_id, user_id, game_key, points_delta, outcome)
JOIN public.games g ON g.external_game_id = s.game_key
JOIN public.picks p ON p.group_id = s.group_id AND p.user_id = s.user_id AND p.game_id = g.id
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta, outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Refresh so the base matview picks up the new settlements.
SELECT public.refresh_leaderboard_stats();

-- ── 1-3: Structure ────────────────────────────────────────────────────────────
SELECT has_materialized_view('public', 'stats_situational_base',
  '1. stats_situational_base is a materialized view');
SELECT has_index('public', 'stats_situational_base', 'uq_stats_situational_base',
  '2. unique index exists for REFRESH ... CONCURRENTLY');
SELECT has_view('public', 'stats_situational_splits',
  '3. stats_situational_splits is a view');

-- ── 4-9: Grants ───────────────────────────────────────────────────────────────
SELECT ok(has_table_privilege('service_role', 'public.stats_situational_base', 'select'),
  '4. service_role can SELECT stats_situational_base');
SELECT ok(NOT has_table_privilege('anon', 'public.stats_situational_base', 'select'),
  '5. anon cannot SELECT stats_situational_base');
SELECT ok(NOT has_table_privilege('authenticated', 'public.stats_situational_base', 'select'),
  '6. authenticated cannot SELECT stats_situational_base');
SELECT ok(has_table_privilege('service_role', 'public.stats_situational_splits', 'select'),
  '7. service_role can SELECT stats_situational_splits');
SELECT ok(NOT has_table_privilege('anon', 'public.stats_situational_splits', 'select'),
  '8. anon cannot SELECT stats_situational_splits');
SELECT ok(NOT has_table_privilege('authenticated', 'public.stats_situational_splits', 'select'),
  '9. authenticated cannot SELECT stats_situational_splits');

-- ── 10-13: Base classification per game (Alice, group A) ───────────────────────
SELECT results_eq(
  $$ SELECT b.is_primetime, b.is_home_pick, b.is_divisional, b.spread_bucket_order
     FROM public.stats_situational_base b
     JOIN public.games g ON g.id = b.game_id AND g.external_game_id = 'sit-g1'
     WHERE b.group_id = '00000000-0000-4000-8000-000000004701'
       AND b.user_id = tests.get_supabase_uid('sit_alice') $$,
  $$ VALUES (true, true, true, 1) $$,
  '10. g1: TNF night, home pick, divisional, spread bucket 1-3');

SELECT results_eq(
  $$ SELECT b.is_primetime, b.is_home_pick, b.is_divisional, b.spread_bucket_order
     FROM public.stats_situational_base b
     JOIN public.games g ON g.id = b.game_id AND g.external_game_id = 'sit-g3'
     WHERE b.group_id = '00000000-0000-4000-8000-000000004701'
       AND b.user_id = tests.get_supabase_uid('sit_alice') $$,
  $$ VALUES (true, true, false, 2) $$,
  '11. g3: SNF night (Sunday 8pm ET), home pick, non-divisional, spread bucket 3.5-6.5');

SELECT results_eq(
  $$ SELECT b.is_primetime, b.is_home_pick, b.is_divisional, b.spread_bucket_order
     FROM public.stats_situational_base b
     JOIN public.games g ON g.id = b.game_id AND g.external_game_id = 'sit-g2'
     WHERE b.group_id = '00000000-0000-4000-8000-000000004701'
       AND b.user_id = tests.get_supabase_uid('sit_alice') $$,
  $$ VALUES (false, false, false, 3) $$,
  '12. g2: Sunday day, away pick, non-divisional, spread bucket 7-9.5');

SELECT results_eq(
  $$ SELECT b.is_divisional, b.spread_bucket_order
     FROM public.stats_situational_base b
     JOIN public.games g ON g.id = b.game_id AND g.external_game_id = 'sit-g5'
     WHERE b.group_id = '00000000-0000-4000-8000-000000004701'
       AND b.user_id = tests.get_supabase_uid('sit_alice') $$,
  $$ VALUES (NULL::boolean, 4) $$,
  '13. g5: unclassified home team -> is_divisional NULL; spread bucket 10+');

-- ── 14-17: Splits math (Alice career, group A) ────────────────────────────────
SELECT results_eq(
  $$ SELECT bucket, decisions, wins, losses, pushes
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_alice')
       AND dimension = 'primetime'
     ORDER BY bucket_order $$,
  $$ VALUES ('primetime', 2, 2, 0, 0), ('day', 4, 2, 1, 1) $$,
  '14. primetime split: 2-0 in primetime, 2-1-1 by day');

SELECT results_eq(
  $$ SELECT bucket, decisions, wins, losses, pushes
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_alice')
       AND dimension = 'home_away'
     ORDER BY bucket_order $$,
  $$ VALUES ('home', 4, 3, 0, 1), ('away', 2, 1, 1, 0) $$,
  '15. home/away split: 3-0-1 on home picks, 1-1 on away picks');

SELECT results_eq(
  $$ SELECT bucket, bucket_order, decisions, wins, losses, pushes
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_alice')
       AND dimension = 'spread'
     ORDER BY bucket_order $$,
  $$ VALUES ('pickem', 0, 1, 0, 0, 1),
            ('1-3', 1, 2, 2, 0, 0),
            ('3.5-6.5', 2, 1, 1, 0, 0),
            ('7-9.5', 3, 1, 0, 1, 0),
            ('10+', 4, 1, 1, 0, 0) $$,
  '16. spread split: six picks across five buckets (1-3 holds g1 + g6)');

SELECT results_eq(
  $$ SELECT bucket, decisions, wins, losses, pushes
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_alice')
       AND dimension = 'divisional'
     ORDER BY bucket_order $$,
  $$ VALUES ('divisional', 1, 1, 0, 0), ('non_divisional', 4, 2, 1, 1) $$,
  '17. divisional split: 1-0 divisional, 2-1-1 non-divisional (g5 NULL excluded)');

-- ── 18: accuracy = wins / (wins + losses); NULL when no decisions ──────────────
SELECT results_eq(
  $$ SELECT dimension, bucket, accuracy
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_alice')
       AND (
         (dimension = 'home_away' AND bucket = 'away')
         OR (dimension = 'primetime' AND bucket = 'day')
         OR (dimension = 'spread' AND bucket = 'pickem')
       )
     ORDER BY dimension, bucket $$,
  $$ VALUES ('home_away', 'away', 0.5000::numeric),
            ('primetime', 'day', 0.6667::numeric),
            ('spread', 'pickem', NULL::numeric) $$,
  '18. accuracy: away 0.5, day 0.6667 (push excluded), pickem NULL (0 decisions)');

-- ── 19: Non-scoring round excluded (Alice has 6 base rows, not 7) ──────────────
SELECT results_eq(
  $$ SELECT count(*)::int
     FROM public.stats_situational_base
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_alice') $$,
  $$ VALUES (6) $$,
  '19. non-scoring week-4 pick (g7) is excluded: 6 base rows');

-- ── 20-21: Cross-group isolation ───────────────────────────────────────────────
SELECT results_eq(
  $$ SELECT count(*)::int
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004701'
       AND user_id = tests.get_supabase_uid('sit_carol') $$,
  $$ VALUES (0) $$,
  '20. Carol (group B) does not appear in group A situational splits');

SELECT results_eq(
  $$ SELECT bucket, decisions, wins
     FROM public.stats_situational_splits
     WHERE group_id = '00000000-0000-4000-8000-000000004702'
       AND user_id = tests.get_supabase_uid('sit_carol')
       AND dimension = 'divisional' $$,
  $$ VALUES ('divisional', 1, 1) $$,
  '21. Carol (group B) has her own divisional row (g1: 1-0)');

SELECT * FROM finish();
ROLLBACK;
