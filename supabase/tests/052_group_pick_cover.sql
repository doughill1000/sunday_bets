-- 052_group_pick_cover.sql
-- pgTAP tests for the group_pick_cover materialized view (issue #387).
--
-- Tests:
--   1. Matview exists and is materialized.
--   2. Unique index exists (required for REFRESH ... CONCURRENTLY).
--   3. Secondary (group_id, season_year) index exists.
--   4. service_role can SELECT; anon/authenticated cannot.
--   5. cover_margin is the picked team's margin over the LOCKED spread, and its sign
--      agrees with the settled outcome (loss < 0, win > 0).
--   6. Auto-missed settlements (pick_id NULL) are excluded.
--   7. Cross-group isolation: group B picks never appear in group A.
--   8. Non-scoring rounds are excluded.
--
-- This suite owns season year 2094 to avoid colliding with other test files.

BEGIN;

SELECT plan(12);

-- ── Stable UUIDs (052_ namespace) ────────────────────────────────────────────

DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000005201', 'Cover Test Group A (052)'),
    ('00000000-0000-4000-8000-000000005202', 'Cover Test Group B (052)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('cv_alice');
SELECT tests.create_supabase_user('cv_bob');
SELECT tests.create_supabase_user('cv_carol');
SELECT tests.create_supabase_user('cv_dave');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('cv_alice'), 'player', 'CV Alice'),
  (tests.get_supabase_uid('cv_bob'),   'player', 'CV Bob'),
  (tests.get_supabase_uid('cv_carol'), 'player', 'CV Carol'),
  (tests.get_supabase_uid('cv_dave'),  'player', 'CV Dave')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Group A: Alice + Bob + Dave.  Group B: Carol only (isolation check).
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000005201', tests.get_supabase_uid('cv_alice'), 'member'),
  ('00000000-0000-4000-8000-000000005201', tests.get_supabase_uid('cv_bob'),   'member'),
  ('00000000-0000-4000-8000-000000005201', tests.get_supabase_uid('cv_dave'),  'member'),
  ('00000000-0000-4000-8000-000000005202', tests.get_supabase_uid('cv_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season (2094) / week 5 (scoring) / week 6 (non-scoring)
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2094) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  (
    (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094),
    5, '2094-10-01 00:00:00+00', '2094-10-08 00:00:00+00', true
  ),
  (
    (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094),
    6, '2094-10-08 00:00:00+00', '2094-10-15 00:00:00+00', false  -- non-scoring round
  )
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams (game A and game B use distinct matchups so both fit in week 5 under uq_games_matchup)
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('CV_HOME',  'CV Home',   'CVH'),
  ('CV_AWAY',  'CV Away',   'CVA'),
  ('CV_HOME2', 'CV Home 2', 'CH2'),
  ('CV_AWAY2', 'CV Away 2', 'CA2')
ON CONFLICT (external_key) DO NOTHING;

-- Game A (week 5): home 24, away 21. Locked line home -3.5 → home-relative margin
--   = (24-21) - 3.5 = -0.5. Home pick did NOT cover (loss by 0.5); away pick covered (+0.5).
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
SELECT w.id, 'cv-052-game-a', '2094-10-03 18:00:00+00', home.id, away.id, 'final', '{"home": 24, "away": 21}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'CV_HOME'
JOIN public.teams away ON away.external_key = 'CV_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094) AND w.week_number = 5
ON CONFLICT (external_game_id) DO NOTHING;

-- Game B (week 5, distinct matchup): home 30, away 10. Locked line home -7 → home-relative
--   margin = (30-10) - 7 = 13. Away pick lost by 13 (a far-worse bad beat than game A's -0.5).
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
SELECT w.id, 'cv-052-game-b', '2094-10-03 21:00:00+00', home.id, away.id, 'final', '{"home": 30, "away": 10}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'CV_HOME2'
JOIN public.teams away ON away.external_key = 'CV_AWAY2'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094) AND w.week_number = 5
ON CONFLICT (external_game_id) DO NOTHING;

-- Game C (week 6, NON-scoring): should be excluded from the matview entirely.
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
SELECT w.id, 'cv-052-game-c', '2094-10-10 18:00:00+00', home.id, away.id, 'final', '{"home": 17, "away": 3}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'CV_HOME'
JOIN public.teams away ON away.external_key = 'CV_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094) AND w.week_number = 6
ON CONFLICT (external_game_id) DO NOTHING;

-- ── Picks (locked line stored on the pick, both NOT NULL since 0204) ───────────
-- locked_spread_team_id is each game's HOME team (home favored by `spread`).
--   Group A game A: Alice → home, Bob → away (locked home -3.5)
--   Group B game B: Carol → away (locked home -7)
--   Group A game C (non-scoring): Alice → home
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight, locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id, p.user_id, g.id, team.id, 'M'::public.weight_enum,
  g.commence_time - interval '1 hour', g.home_team_id, p.spread, p.user_id
FROM (VALUES
  ('00000000-0000-4000-8000-000000005201'::uuid, tests.get_supabase_uid('cv_alice'), 'cv-052-game-a', 'CV_HOME',  3.5::numeric),
  ('00000000-0000-4000-8000-000000005201'::uuid, tests.get_supabase_uid('cv_bob'),   'cv-052-game-a', 'CV_AWAY',  3.5::numeric),
  ('00000000-0000-4000-8000-000000005202'::uuid, tests.get_supabase_uid('cv_carol'), 'cv-052-game-b', 'CV_AWAY2', 7::numeric),
  ('00000000-0000-4000-8000-000000005201'::uuid, tests.get_supabase_uid('cv_alice'), 'cv-052-game-c', 'CV_HOME',  3.5::numeric)
) p(group_id, user_id, game_key, team_key, spread)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams team ON team.external_key = p.team_key
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ────────────────────────────────────────────────────────────────
-- Real picks: Alice(home,A)=loss, Bob(away,A)=win, Carol(away,B)=loss, Alice(home,C)=win.
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT
  p.group_id, p.user_id, p.game_id, p.id,
  CASE WHEN p.picked_team_id = (SELECT id FROM public.teams WHERE external_key = 'CV_HOME') THEN 3 ELSE -3 END,
  CASE WHEN p.game_id = (SELECT id FROM public.games WHERE external_game_id = 'cv-052-game-a')
         THEN (CASE WHEN p.picked_team_id = (SELECT id FROM public.teams WHERE external_key = 'CV_HOME')
                    THEN 'loss'::public.pick_outcome ELSE 'win'::public.pick_outcome END)
       WHEN p.game_id = (SELECT id FROM public.games WHERE external_game_id = 'cv-052-game-b')
         THEN 'loss'::public.pick_outcome
       ELSE 'win'::public.pick_outcome END,
  '2094-10-03 22:00:00+00'
FROM public.picks p
WHERE p.game_id IN (SELECT id FROM public.games WHERE external_game_id IN ('cv-052-game-a', 'cv-052-game-b', 'cv-052-game-c'))
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta, outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Auto-missed settlement for Dave (no real pick → pick_id NULL) on game A: must be excluded.
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT '00000000-0000-4000-8000-000000005201'::uuid, tests.get_supabase_uid('cv_dave'), g.id, NULL, -1, 'missed'::public.pick_outcome, '2094-10-03 22:00:00+00'
FROM public.games g WHERE g.external_game_id = 'cv-052-game-a'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- Refresh so assertions see the new settlements.
SELECT public.refresh_leaderboard_stats();

-- ── 1–3: Structural checks ─────────────────────────────────────────────────────

SELECT has_materialized_view('public', 'group_pick_cover', '1. group_pick_cover is a materialized view');
SELECT has_index('public', 'group_pick_cover', 'uq_group_pick_cover', '2. unique index exists for REFRESH ... CONCURRENTLY');
SELECT has_index('public', 'group_pick_cover', 'idx_group_pick_cover_group_season', '3. secondary (group_id, season_year) index exists');

-- ── 4: Grant checks ─────────────────────────────────────────────────────────────

SELECT ok(has_table_privilege('service_role', 'public.group_pick_cover', 'select'), '4a. service_role can SELECT group_pick_cover');
SELECT ok(NOT has_table_privilege('anon', 'public.group_pick_cover', 'select'), '4b. anon cannot SELECT group_pick_cover');
SELECT ok(NOT has_table_privilege('authenticated', 'public.group_pick_cover', 'select'), '4c. authenticated cannot SELECT group_pick_cover');

-- ── 5: cover_margin math + outcome agreement ────────────────────────────────────

-- Alice picked home in game A: (24-21) - 3.5 = -0.5 (a loss by half a point → bad beat).
SELECT results_eq(
  $$ SELECT cover_margin, outcome::text FROM public.group_pick_cover
     WHERE group_id = '00000000-0000-4000-8000-000000005201'
       AND user_id = tests.get_supabase_uid('cv_alice') AND season_year = 2094 $$,
  $$ VALUES (-0.5::numeric, 'loss') $$,
  '5a. Alice (home) cover_margin = -0.5, outcome loss'
);

-- Bob picked away in game A: away covered by the same 0.5 → +0.5, a win.
SELECT results_eq(
  $$ SELECT cover_margin, outcome::text FROM public.group_pick_cover
     WHERE group_id = '00000000-0000-4000-8000-000000005201'
       AND user_id = tests.get_supabase_uid('cv_bob') AND season_year = 2094 $$,
  $$ VALUES (0.5::numeric, 'win') $$,
  '5b. Bob (away) cover_margin = +0.5, outcome win'
);

-- Carol picked away in game B: away lost by 13 → -13.
SELECT results_eq(
  $$ SELECT cover_margin, outcome::text FROM public.group_pick_cover
     WHERE group_id = '00000000-0000-4000-8000-000000005202'
       AND user_id = tests.get_supabase_uid('cv_carol') AND season_year = 2094 $$,
  $$ VALUES (-13::numeric, 'loss') $$,
  '5c. Carol (away) cover_margin = -13, outcome loss'
);

-- ── 6: Auto-missed (pick_id NULL) excluded ──────────────────────────────────────

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.group_pick_cover
     WHERE group_id = '00000000-0000-4000-8000-000000005201'
       AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'cv-052-game-a') $$,
  $$ VALUES (2) $$,
  '6. game A has 2 cover rows (Alice + Bob); Dave''s auto-missed settlement is excluded'
);

-- ── 7: Cross-group isolation ────────────────────────────────────────────────────

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.group_pick_cover
     WHERE group_id = '00000000-0000-4000-8000-000000005201'
       AND user_id = tests.get_supabase_uid('cv_carol') $$,
  $$ VALUES (0) $$,
  '7. Carol (group B) does not appear in group A cover rows'
);

-- ── 8: Non-scoring rounds excluded ──────────────────────────────────────────────

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.group_pick_cover
     WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'cv-052-game-c') $$,
  $$ VALUES (0) $$,
  '8. Non-scoring round (week 6) game C is excluded from group_pick_cover'
);

SELECT * FROM finish();
ROLLBACK;
