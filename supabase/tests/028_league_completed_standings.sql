-- 028_league_completed_standings.sql
-- pgTAP tests for public.league_completed_standings (issue #279, ADR-0013).
-- The view is a plain select over leaderboard_season_totals restricted to seasons
-- whose every scoreable (non-postponed/cancelled) game has a recorded final score
-- (final_scores populated) — mirroring advance_week_if_complete rather than trusting
-- the games.status string, so a fully-graded season is not hidden by a stale status.
-- Readable by service_role only; anon and authenticated are revoked.
--
-- owns season years 2095, 2096, 2097

BEGIN;

SELECT plan(11);

-- ── Structural / grant assertions (no data refresh needed) ────────────────────

SELECT has_view('public', 'league_completed_standings',
  'league_completed_standings plain view exists');

SELECT ok(
  has_table_privilege('service_role', 'public.league_completed_standings', 'select'),
  'service_role can select league_completed_standings'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.league_completed_standings', 'select'),
  'anon cannot select league_completed_standings'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.league_completed_standings', 'select'),
  'authenticated cannot select league_completed_standings'
);

-- ── Seed ─────────────────────────────────────────────────────────────────────
-- Namespace: 00000000-0000-4000-8000-0000000028xx
--
-- Group A: alice (champion, rank 1) + bob (wooden spoon, rank 2) in season 2097.
-- Group B: carol (member) — seeded so group B rows appear in the completed view,
--          and so cross-group isolation can be verified.
--
-- Season 2097 = completed  (one is_scoring week, one game status='final').
-- Season 2096 = in-progress (one is_scoring week, one game status='scheduled').

-- Groups
DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-0000000028a1', 'LCS Test Group A (028)'),
    ('00000000-0000-4000-8000-0000000028b2', 'LCS Test Group B (028)')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Players
SELECT tests.create_supabase_user('lcs_alice');
SELECT tests.create_supabase_user('lcs_bob');
SELECT tests.create_supabase_user('lcs_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('lcs_alice'), 'player', 'LCS Alice'),
  (tests.get_supabase_uid('lcs_bob'),   'player', 'LCS Bob'),
  (tests.get_supabase_uid('lcs_carol'), 'player', 'LCS Carol')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Memberships: alice + bob in group A only; carol in group B only.
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-0000000028a1', tests.get_supabase_uid('lcs_alice'), 'member'),
  ('00000000-0000-4000-8000-0000000028a1', tests.get_supabase_uid('lcs_bob'),   'member'),
  ('00000000-0000-4000-8000-0000000028b2', tests.get_supabase_uid('lcs_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Seasons (exclusive to this file)
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2097)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.seasons (league, year) VALUES ('NFL', 2096)
ON CONFLICT (league, year) DO NOTHING;

-- Weeks: one is_scoring week per season.
-- is_scoring is left at the default (true) to exercise the normal-week path.
INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2097),
  1,
  '2097-09-04 00:00:00+00',
  '2097-09-11 00:00:00+00'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2096),
  1,
  '2096-09-05 00:00:00+00',
  '2096-09-12 00:00:00+00'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams (LCS-prefixed external_keys to avoid collisions with other test files)
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('LCS_HOME', 'LCS Home Team', 'LCH'),
  ('LCS_AWAY', 'LCS Away Team', 'LCA')
ON CONFLICT (external_key) DO NOTHING;

-- Games
-- 2097: status='final' with final_scores → completed season.
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id,
  'lcs-028-2097-g1',
  '2097-09-07 18:00:00+00',
  home.id,
  away.id,
  'final',
  '{"home": 28, "away": 14}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'LCS_HOME'
JOIN public.teams away ON away.external_key = 'LCS_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2097)
  AND w.week_number = 1
ON CONFLICT (external_game_id) DO NOTHING;

-- 2096: status='scheduled' → at least one non-final game keeps season in-progress.
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status
)
SELECT
  w.id,
  'lcs-028-2096-g1',
  '2096-09-08 18:00:00+00',
  home.id,
  away.id,
  'scheduled'
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'LCS_HOME'
JOIN public.teams away ON away.external_key = 'LCS_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2096)
  AND w.week_number = 1
ON CONFLICT (external_game_id) DO NOTHING;

-- Picks for season 2097:
--   Group A: alice picks home (wins), bob picks away (loses).
--   Group B: carol picks home (wins).
-- No picks needed for 2096 — the view filters it out via the completion check.
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
  7.0,
  p.user_id
FROM (
  VALUES
    ('00000000-0000-4000-8000-0000000028a1'::uuid, tests.get_supabase_uid('lcs_alice'), 'LCS_HOME'),
    ('00000000-0000-4000-8000-0000000028a1'::uuid, tests.get_supabase_uid('lcs_bob'),   'LCS_AWAY'),
    ('00000000-0000-4000-8000-0000000028b2'::uuid, tests.get_supabase_uid('lcs_carol'), 'LCS_HOME')
) p(group_id, user_id, team_key)
JOIN public.games  g    ON g.external_game_id  = 'lcs-028-2097-g1'
JOIN public.teams  team ON team.external_key   = p.team_key
JOIN public.teams  home ON home.external_key   = 'LCS_HOME'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- Settlements: alice +3 win, bob -3 loss, carol +3 win.
-- Home wins 28-14 so alice (home) and carol (home) cover; bob (away) does not.
INSERT INTO public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
SELECT
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  CASE p.user_id
    WHEN tests.get_supabase_uid('lcs_bob') THEN -3
    ELSE                                          3
  END,
  CASE p.user_id
    WHEN tests.get_supabase_uid('lcs_bob') THEN 'loss'::public.pick_outcome
    ELSE                                         'win'::public.pick_outcome
  END,
  '2097-09-07 22:00:00+00'
FROM public.picks p
WHERE p.game_id = (SELECT id FROM public.games WHERE external_game_id = 'lcs-028-2097-g1')
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta,
      outcome      = EXCLUDED.outcome,
      graded_at    = EXCLUDED.graded_at;

-- ── Regression seed: a fully-graded season whose status never advanced ─────────
-- Season 2095 = completed-by-final_scores: its only scoring game still reads
-- status='scheduled' (e.g. an imported/backfilled season, or a status sync that
-- stopped) but carries final_scores + a settled pick. The view must treat it as
-- complete via final_scores, not the stale status. Reuses group A + alice.
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2095)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2095),
  1,
  '2095-09-06 00:00:00+00',
  '2095-09-13 00:00:00+00'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- final_scores present but status deliberately left 'scheduled'.
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id,
  'lcs-028-2095-g1',
  '2095-09-09 18:00:00+00',
  home.id,
  away.id,
  'scheduled',
  '{"home": 21, "away": 17}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'LCS_HOME'
JOIN public.teams away ON away.external_key = 'LCS_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2095)
  AND w.week_number = 1
ON CONFLICT (external_game_id) DO NOTHING;

-- alice (group A) picks home and wins; gives season 2095 a leaderboard row.
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id,
  weight, locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  '00000000-0000-4000-8000-0000000028a1'::uuid,
  tests.get_supabase_uid('lcs_alice'),
  g.id,
  home.id,
  'M'::public.weight_enum,
  g.commence_time - interval '1 hour',
  home.id,
  7.0,
  tests.get_supabase_uid('lcs_alice')
FROM public.games g
JOIN public.teams home ON home.external_key = 'LCS_HOME'
WHERE g.external_game_id = 'lcs-028-2095-g1'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

INSERT INTO public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
SELECT
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  3,
  'win'::public.pick_outcome,
  '2095-09-09 22:00:00+00'
FROM public.picks p
WHERE p.game_id = (SELECT id FROM public.games WHERE external_game_id = 'lcs-028-2095-g1')
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta,
      outcome      = EXCLUDED.outcome,
      graded_at    = EXCLUDED.graded_at;

-- Matviews are refreshed only at the end of a grading run (#191): refresh so the
-- settlements above are visible to the assertions below.
SELECT public.refresh_leaderboard_stats();

-- ── Data assertions ───────────────────────────────────────────────────────────

-- 5. Completed season 2097 IS present in league_completed_standings for group A.
--    Expects 2 rows: one for alice, one for bob.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.league_completed_standings
    WHERE season_year = 2097
      AND group_id = '00000000-0000-4000-8000-0000000028a1'
  $$,
  $$ VALUES (2) $$,
  'league_completed_standings: group A has 2 rows for completed season 2097'
);

-- 6. In-progress season 2096 is ABSENT from the view entirely.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.league_completed_standings
    WHERE season_year = 2096
  $$,
  $$ VALUES (0) $$,
  'league_completed_standings: in-progress season 2096 has zero rows'
);

-- 7. Champion: rank = 1 in (group A, 2097) belongs to alice (total_points = 3).
SELECT is(
  (
    SELECT user_id
    FROM public.league_completed_standings
    WHERE season_year = 2097
      AND group_id = '00000000-0000-4000-8000-0000000028a1'
      AND rank = 1
  ),
  tests.get_supabase_uid('lcs_alice'),
  'league_completed_standings: rank 1 (champion) in group A 2097 is alice'
);

-- 8. Wooden spoon: the highest rank value in (group A, 2097) belongs to bob (total_points = -3).
SELECT is(
  (
    SELECT user_id
    FROM public.league_completed_standings
    WHERE season_year = 2097
      AND group_id = '00000000-0000-4000-8000-0000000028a1'
    ORDER BY rank DESC
    LIMIT 1
  ),
  tests.get_supabase_uid('lcs_bob'),
  'league_completed_standings: last rank (wooden spoon) in group A 2097 is bob'
);

-- 9. Cross-group isolation: group B exclusive member carol never appears in group A rows.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.league_completed_standings
    WHERE group_id = '00000000-0000-4000-8000-0000000028a1'
      AND user_id = tests.get_supabase_uid('lcs_carol')
  $$,
  $$ VALUES (0) $$,
  'league_completed_standings: group B member carol is absent from group A rows'
);

-- 10. Cross-group isolation: carol appears under group B's id for 2097.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.league_completed_standings
    WHERE season_year = 2097
      AND group_id = '00000000-0000-4000-8000-0000000028b2'
      AND user_id = tests.get_supabase_uid('lcs_carol')
  $$,
  $$ VALUES (1) $$,
  'league_completed_standings: group B member carol present under group B for 2097'
);

-- 11. Regression (this fix): season 2095 is graded via final_scores while its game
--     still reads status='scheduled'. It must be treated as completed and surface
--     alice (group A) as its champion — proving completion keys off final_scores,
--     not the stale status string.
SELECT is(
  (
    SELECT user_id
    FROM public.league_completed_standings
    WHERE season_year = 2095
      AND group_id = '00000000-0000-4000-8000-0000000028a1'
      AND rank = 1
  ),
  tests.get_supabase_uid('lcs_alice'),
  'league_completed_standings: season graded via final_scores (status still scheduled) is completed; alice is champion'
);

SELECT * FROM finish();
ROLLBACK;
