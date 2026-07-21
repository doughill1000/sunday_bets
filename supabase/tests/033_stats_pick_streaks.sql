-- 033_stats_pick_streaks.sql
-- pgTAP tests for the stats_pick_streaks materialized view (issue #296, Tier-C Hot Hand).
--
-- Tests:
--   1. Matview exists and is materialized.
--   2. Unique index exists (required for REFRESH ... CONCURRENTLY).
--   3. service_role can SELECT; anon/authenticated cannot.
--   4. Cross-group isolation: group B picks never appear in group A results.
--   5. Alice streak W-W-L-W → current=1, max=2.
--   6. Bob streak W-L-W-miss → current=0, max=1.
--   7. Carol streak W-W-push-miss → push neutral, miss breaks → current=0, max=2.
--   8. graded_picks excludes pushes.
--   9. Non-scoring week excluded from streak calculation.
--  10. Group A has exactly 2 streak rows (Alice + Bob only).
--
-- One game per scoring week so the uq_games_matchup constraint is satisfied.
-- This suite owns season year 2098, weeks 1-5 to avoid colliding with other files.

BEGIN;

SELECT plan(12);

-- ── Stable UUIDs (033_ namespace) ────────────────────────────────────────────

DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000003301', 'Streak Test Group A (033)'),
    ('00000000-0000-4000-8000-000000003302', 'Streak Test Group B (033)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('sk_alice');
SELECT tests.create_supabase_user('sk_bob');
SELECT tests.create_supabase_user('sk_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('sk_alice'), 'player', 'SK Alice'),
  (tests.get_supabase_uid('sk_bob'),   'player', 'SK Bob'),
  (tests.get_supabase_uid('sk_carol'), 'player', 'SK Carol')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Group A: Alice + Bob.  Group B: Carol (cross-group isolation check).
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000003301', tests.get_supabase_uid('sk_alice'), 'member'),
  ('00000000-0000-4000-8000-000000003301', tests.get_supabase_uid('sk_bob'),   'member'),
  ('00000000-0000-4000-8000-000000003302', tests.get_supabase_uid('sk_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season 2098: four scoring weeks + one non-scoring week.
-- One game per week (avoids uq_games_matchup on the same team-pair in same week).
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2098) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098), 1, '2098-09-05 00:00:00+00', '2098-09-12 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098), 2, '2098-09-12 00:00:00+00', '2098-09-19 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098), 3, '2098-09-19 00:00:00+00', '2098-09-26 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098), 4, '2098-09-26 00:00:00+00', '2098-10-03 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098), 5, '2098-10-03 00:00:00+00', '2098-10-10 00:00:00+00', false)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Two teams (one pair per week is fine since each week has only one game).
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('SK_HOME', 'SK Home', 'SKH'),
  ('SK_AWAY', 'SK Away', 'SKA')
ON CONFLICT (external_key) DO NOTHING;

-- ── Games — one per week ──────────────────────────────────────────────────────
-- G1 (wk 1): Alice win, Bob win, Carol win
-- G2 (wk 2): Alice win, Bob loss, Carol win
-- G3 (wk 3): Alice loss, Bob win, Carol push
-- G4 (wk 4): Alice win, Bob miss (no pick), Carol miss (no pick)
-- G5 (wk 5, non-scoring): Alice win — excluded from streaks

INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id,
  g.ext_id,
  g.kick,
  home.id, away.id,
  'final',
  '{"home": 28, "away": 14}'::jsonb
FROM (VALUES
  (1, 'sk-033-g1', '2098-09-07 18:00:00+00'::timestamptz),
  (2, 'sk-033-g2', '2098-09-14 18:00:00+00'::timestamptz),
  (3, 'sk-033-g3', '2098-09-21 18:00:00+00'::timestamptz),
  (4, 'sk-033-g4', '2098-09-28 18:00:00+00'::timestamptz),
  (5, 'sk-033-g5', '2098-10-05 18:00:00+00'::timestamptz)
) g(wk, ext_id, kick)
JOIN public.weeks w ON w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2098)
  AND w.week_number = g.wk
JOIN public.teams home ON home.external_key = 'SK_HOME'
JOIN public.teams away ON away.external_key = 'SK_AWAY'
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line)
SELECT g.id, 'fanduel', home.id, 3.5, true
FROM public.games g
JOIN public.teams home ON home.external_key = 'SK_HOME'
WHERE g.external_game_id IN ('sk-033-g1','sk-033-g2','sk-033-g3','sk-033-g4','sk-033-g5')
ON CONFLICT DO NOTHING;

-- ── Picks ─────────────────────────────────────────────────────────────────────
-- Alice: all four scoring games + non-scoring G5
-- Bob:   G1, G2, G3 (misses G4)
-- Carol: G1, G2, G3 (misses G4)

INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id,
  weight, locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id, p.user_id, g.id, team.id,
  'M'::public.weight_enum,
  g.commence_time - interval '1 hour',
  home.id, 3.5, p.user_id
FROM (VALUES
  -- Alice (group A)
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_alice'), 'sk-033-g1', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_alice'), 'sk-033-g2', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_alice'), 'sk-033-g3', 'SK_AWAY'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_alice'), 'sk-033-g4', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_alice'), 'sk-033-g5', 'SK_HOME'),
  -- Bob (group A): no pick for G4
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_bob'),   'sk-033-g1', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_bob'),   'sk-033-g2', 'SK_AWAY'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_bob'),   'sk-033-g3', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_bob'),   'sk-033-g5', 'SK_HOME'),
  -- Carol (group B): G3 will be a push; no pick for G4
  ('00000000-0000-4000-8000-000000003302'::uuid, tests.get_supabase_uid('sk_carol'), 'sk-033-g1', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003302'::uuid, tests.get_supabase_uid('sk_carol'), 'sk-033-g2', 'SK_HOME'),
  ('00000000-0000-4000-8000-000000003302'::uuid, tests.get_supabase_uid('sk_carol'), 'sk-033-g3', 'SK_HOME')
) p(group_id, user_id, game_key, team_key)
JOIN public.games g    ON g.external_game_id = p.game_key
JOIN public.teams team ON team.external_key = p.team_key
JOIN public.teams home ON home.external_key = 'SK_HOME'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ───────────────────────────────────────────────────────────────
-- Alice: G1=win G2=win G3=loss G4=win  → W-W-L-W, current=1, max=2
-- Bob:   G1=win G2=loss G3=win G4=miss → W-L-W-miss, current=0, max=1
-- Carol: G1=win G2=win G3=push G4=miss → W-W-push-miss, current=0, max=2

-- Alice settlements (picked-team row)
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT
  '00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_alice'),
  g.id, p.id, v.pts, v.outcome::public.pick_outcome, '2098-09-28 23:00:00+00'
FROM (VALUES
  ('sk-033-g1', 3,  'win'),
  ('sk-033-g2', 3,  'win'),
  ('sk-033-g3', -1, 'loss'),
  ('sk-033-g4', 3,  'win')
) v(ext_id, pts, outcome)
JOIN public.games g ON g.external_game_id = v.ext_id
JOIN public.picks p ON p.game_id = g.id
  AND p.group_id = '00000000-0000-4000-8000-000000003301'
  AND p.user_id  = tests.get_supabase_uid('sk_alice')
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET pick_id = EXCLUDED.pick_id, points_delta = EXCLUDED.points_delta,
      outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Bob settlements
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT
  '00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_bob'),
  g.id, p.id, v.pts, v.outcome::public.pick_outcome, '2098-09-28 23:00:00+00'
FROM (VALUES
  ('sk-033-g1', 3,  'win'),
  ('sk-033-g2', -1, 'loss'),
  ('sk-033-g3', 3,  'win')
) v(ext_id, pts, outcome)
JOIN public.games g ON g.external_game_id = v.ext_id
JOIN public.picks p ON p.game_id = g.id
  AND p.group_id = '00000000-0000-4000-8000-000000003301'
  AND p.user_id  = tests.get_supabase_uid('sk_bob')
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET pick_id = EXCLUDED.pick_id, points_delta = EXCLUDED.points_delta,
      outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Bob G4: missed (pick_id = null)
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT '00000000-0000-4000-8000-000000003301'::uuid, tests.get_supabase_uid('sk_bob'),
       g.id, NULL, 0, 'missed'::public.pick_outcome, '2098-09-28 23:00:00+00'
FROM public.games g WHERE g.external_game_id = 'sk-033-g4'
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET pick_id = NULL, outcome = 'missed'::public.pick_outcome;

-- Carol settlements
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT
  '00000000-0000-4000-8000-000000003302'::uuid, tests.get_supabase_uid('sk_carol'),
  g.id, p.id, v.pts, v.outcome::public.pick_outcome, '2098-09-28 23:00:00+00'
FROM (VALUES
  ('sk-033-g1', 3, 'win'),
  ('sk-033-g2', 3, 'win'),
  ('sk-033-g3', 0, 'push')
) v(ext_id, pts, outcome)
JOIN public.games g ON g.external_game_id = v.ext_id
JOIN public.picks p ON p.game_id = g.id
  AND p.group_id = '00000000-0000-4000-8000-000000003302'
  AND p.user_id  = tests.get_supabase_uid('sk_carol')
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET pick_id = EXCLUDED.pick_id, points_delta = EXCLUDED.points_delta,
      outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Carol G4: missed (no pick placed)
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT '00000000-0000-4000-8000-000000003302'::uuid, tests.get_supabase_uid('sk_carol'),
       g.id, NULL, 0, 'missed'::public.pick_outcome, '2098-09-28 23:00:00+00'
FROM public.games g WHERE g.external_game_id = 'sk-033-g4'
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET pick_id = NULL, outcome = 'missed'::public.pick_outcome;

SELECT public.refresh_leaderboard_stats();

-- ── 1–2: Structural checks ────────────────────────────────────────────────────

SELECT has_materialized_view('public', 'stats_pick_streaks',
  '1. stats_pick_streaks is a materialized view');

SELECT has_index('public', 'stats_pick_streaks', 'uq_stats_pick_streaks',
  '2. unique index exists for REFRESH ... CONCURRENTLY');

-- ── 3: Grant checks ───────────────────────────────────────────────────────────

SELECT ok(
  has_table_privilege('service_role', 'public.stats_pick_streaks', 'select'),
  '3a. service_role can SELECT stats_pick_streaks'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.stats_pick_streaks', 'select'),
  '3b. anon cannot SELECT stats_pick_streaks'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.stats_pick_streaks', 'select'),
  '3c. authenticated cannot SELECT stats_pick_streaks'
);

-- ── 4: Cross-group isolation ──────────────────────────────────────────────────

SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003301'
      AND season_year = 2098
      AND user_id = tests.get_supabase_uid('sk_carol')
  $$,
  $$ VALUES (0) $$,
  '4. Carol (group B) never appears in group A streak rows'
);

-- ── 5: Alice W-W-L-W → current=1, max=2 ─────────────────────────────────────

SELECT results_eq(
  $$
    SELECT current_streak, max_streak
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003301'
      AND season_year = 2098
      AND user_id = tests.get_supabase_uid('sk_alice')
  $$,
  $$ VALUES (1::bigint, 2::bigint) $$,
  '5. Alice W-W-L-W: current_streak=1, max_streak=2'
);

-- ── 6: Bob W-L-W-miss → current=0, max=1 ────────────────────────────────────

SELECT results_eq(
  $$
    SELECT current_streak, max_streak
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003301'
      AND season_year = 2098
      AND user_id = tests.get_supabase_uid('sk_bob')
  $$,
  $$ VALUES (0::bigint, 1::bigint) $$,
  '6. Bob W-L-W-miss: current_streak=0, max_streak=1'
);

-- ── 7: Carol W-W-push-miss → push neutral, miss breaks → current=0, max=2 ───

SELECT results_eq(
  $$
    SELECT current_streak, max_streak
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003302'
      AND season_year = 2098
      AND user_id = tests.get_supabase_uid('sk_carol')
  $$,
  $$ VALUES (0::bigint, 2::bigint) $$,
  '7. Carol W-W-push-miss: push neutral, miss breaks → current=0, max=2'
);

-- ── 8: graded_picks excludes pushes ──────────────────────────────────────────
-- Carol: G1(win) G2(win) G3(push excluded) G4(missed) → graded_picks=3

SELECT results_eq(
  $$
    SELECT graded_picks
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003302'
      AND season_year = 2098
      AND user_id = tests.get_supabase_uid('sk_carol')
  $$,
  $$ VALUES (3::bigint) $$,
  '8. Carol graded_picks=3 (push excluded from non-push count)'
);

-- ── 9: Non-scoring week 5 excluded ───────────────────────────────────────────
-- Alice placed picks in weeks 1-4 (scoring) and week 5 (non-scoring).
-- graded_picks should count only scoring-week picks = 4.

SELECT results_eq(
  $$
    SELECT graded_picks
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003301'
      AND season_year = 2098
      AND user_id = tests.get_supabase_uid('sk_alice')
  $$,
  $$ VALUES (4::bigint) $$,
  '9. Alice graded_picks=4 (week 5 non-scoring pick excluded)'
);

-- ── 10: Group A row count ─────────────────────────────────────────────────────

SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.stats_pick_streaks
    WHERE group_id = '00000000-0000-4000-8000-000000003301'
      AND season_year = 2098
  $$,
  $$ VALUES (2) $$,  -- count(*)::int so integer is correct here
  '10. Group A has exactly 2 streak rows (Alice + Bob)'
);

SELECT * FROM finish();
ROLLBACK;
