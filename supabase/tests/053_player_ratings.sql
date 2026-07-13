-- 053_player_ratings.sql
-- pgTAP tests for the cross-season credibility rating read model (issue #361, ADR-0032).
--
-- The RATING MATH is a pure TypeScript fold ($lib/server/rating) — exhaustively unit-tested there,
-- since pgTAP can't run it — so this suite owns the two things that ARE SQL:
--   A. public.player_ratings — the persisted table's STRUCTURE + service-role-only access contract
--      (RLS on, no client grant). Its rows are written by TS, so there is nothing to assert on
--      values here; the integration test covers the populated table.
--   B. public.player_rating_inputs — the view that decides WHICH settled decisions count. Its
--      filtering (spread only, missed excluded, non-scoring excluded, per-group) is the fairness
--      boundary of §3, and is fully testable in SQL.
--
-- This suite owns season year 2093 to avoid colliding with other test files.

BEGIN;

SELECT plan(18);

-- ── Stable UUIDs (053_ namespace) ────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000005301', 'Rating Test Group A (053)'),
    ('00000000-0000-4000-8000-000000005302', 'Rating Test Group B (053)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('pr_alice');
SELECT tests.create_supabase_user('pr_bob');
SELECT tests.create_supabase_user('pr_carol');
SELECT tests.create_supabase_user('pr_dave');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('pr_alice'), 'player', 'PR Alice'),
  (tests.get_supabase_uid('pr_bob'),   'player', 'PR Bob'),
  (tests.get_supabase_uid('pr_carol'), 'player', 'PR Carol'),
  (tests.get_supabase_uid('pr_dave'),  'player', 'PR Dave')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Group A: Alice + Bob + Dave.  Group B: Carol (isolation check).
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000005301', tests.get_supabase_uid('pr_alice'), 'member'),
  ('00000000-0000-4000-8000-000000005301', tests.get_supabase_uid('pr_bob'),   'member'),
  ('00000000-0000-4000-8000-000000005301', tests.get_supabase_uid('pr_dave'),  'member'),
  ('00000000-0000-4000-8000-000000005302', tests.get_supabase_uid('pr_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season (2093) / week 5 (scoring) / week 6 (non-scoring)
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2093) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2093),
    5, '2093-10-01 00:00:00+00', '2093-10-08 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2093),
    6, '2093-10-08 00:00:00+00', '2093-10-15 00:00:00+00', false)
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('PR_HOME', 'PR Home', 'PRH'),
  ('PR_AWAY', 'PR Away', 'PRA')
ON CONFLICT (external_key) DO NOTHING;

-- Game A (scoring week 5) and Game C (non-scoring week 6), same matchup, distinct weeks.
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
SELECT w.id, 'pr-053-game-a', '2093-10-03 18:00:00+00', home.id, away.id, 'final', '{"home": 24, "away": 20}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'PR_HOME'
JOIN public.teams away ON away.external_key = 'PR_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2093) AND w.week_number = 5
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
SELECT w.id, 'pr-053-game-c', '2093-10-10 18:00:00+00', home.id, away.id, 'final', '{"home": 30, "away": 10}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'PR_HOME'
JOIN public.teams away ON away.external_key = 'PR_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2093) AND w.week_number = 6
ON CONFLICT (external_game_id) DO NOTHING;

-- ── Picks (locked line NOT NULL since 0204) ──────────────────────────────────
--   Group A game A: Alice → home (weight H), Bob → away (weight M)
--   Group B game A: Carol → home (weight A)   [isolation]
--   Group A game C (non-scoring): Alice → home (weight L)  [must be excluded]
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight, locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id, p.user_id, g.id, team.id, p.weight::public.weight_enum,
  g.commence_time - interval '1 hour', g.home_team_id, 3.5::numeric, p.user_id
FROM (VALUES
  ('00000000-0000-4000-8000-000000005301'::uuid, tests.get_supabase_uid('pr_alice'), 'pr-053-game-a', 'PR_HOME', 'H'),
  ('00000000-0000-4000-8000-000000005301'::uuid, tests.get_supabase_uid('pr_bob'),   'pr-053-game-a', 'PR_AWAY', 'M'),
  ('00000000-0000-4000-8000-000000005302'::uuid, tests.get_supabase_uid('pr_carol'), 'pr-053-game-a', 'PR_HOME', 'A'),
  ('00000000-0000-4000-8000-000000005301'::uuid, tests.get_supabase_uid('pr_alice'), 'pr-053-game-c', 'PR_HOME', 'L')
) p(group_id, user_id, game_key, team_key, weight)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams team ON team.external_key = p.team_key
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements (outcome inserted directly; the view surfaces ps.outcome as-is) ──
-- Real picks: Alice(win,H), Bob(loss,M), Carol(push,A), Alice game C(win,L, non-scoring → excluded).
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT
  p.group_id, p.user_id, p.game_id, p.id, 0,
  CASE
    WHEN p.user_id = tests.get_supabase_uid('pr_alice') AND p.game_id = (SELECT id FROM public.games WHERE external_game_id = 'pr-053-game-a') THEN 'win'::public.pick_outcome
    WHEN p.user_id = tests.get_supabase_uid('pr_bob')   THEN 'loss'::public.pick_outcome
    WHEN p.user_id = tests.get_supabase_uid('pr_carol') THEN 'push'::public.pick_outcome
    ELSE 'win'::public.pick_outcome  -- Alice game C (non-scoring)
  END,
  '2093-10-03 22:00:00+00'
FROM public.picks p
WHERE p.game_id IN (SELECT id FROM public.games WHERE external_game_id IN ('pr-053-game-a', 'pr-053-game-c'))
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET pick_id = EXCLUDED.pick_id, outcome = EXCLUDED.outcome;

-- Auto-missed settlement for Dave (no real pick → pick_id NULL, outcome 'missed'): must be excluded.
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT '00000000-0000-4000-8000-000000005301'::uuid, tests.get_supabase_uid('pr_dave'), g.id, NULL, -1, 'missed'::public.pick_outcome, '2093-10-03 22:00:00+00'
FROM public.games g WHERE g.external_game_id = 'pr-053-game-a'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ══ A. player_ratings table: structure + access contract ════════════════════════

SELECT has_table('public', 'player_ratings', '1. player_ratings table exists');
SELECT col_is_pk('public', 'player_ratings', ARRAY['group_id', 'user_id'],
  '2. primary key is (group_id, user_id)');
SELECT has_column('public', 'player_ratings', 'rating', '3a. has rating column');
SELECT has_column('public', 'player_ratings', 'decisions', '3b. has decisions column');
SELECT has_column('public', 'player_ratings', 'decisions_to_qualify', '3c. has decisions_to_qualify column');
SELECT has_column('public', 'player_ratings', 'season_delta', '3d. has season_delta column');

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.player_ratings'::regclass),
  true,
  '4. RLS is enabled on player_ratings'
);

SELECT ok(has_table_privilege('service_role', 'public.player_ratings', 'select'),
  '5a. service_role can SELECT player_ratings');
SELECT ok(NOT has_table_privilege('anon', 'public.player_ratings', 'select'),
  '5b. anon cannot SELECT player_ratings');
SELECT ok(NOT has_table_privilege('authenticated', 'public.player_ratings', 'select'),
  '5c. authenticated cannot SELECT player_ratings');

-- ══ B. player_rating_inputs view: grants + filtering ════════════════════════════

SELECT has_view('public', 'player_rating_inputs', '6. player_rating_inputs view exists');
SELECT ok(has_table_privilege('service_role', 'public.player_rating_inputs', 'select'),
  '7a. service_role can SELECT player_rating_inputs');
SELECT ok(NOT has_table_privilege('authenticated', 'public.player_rating_inputs', 'select'),
  '7b. authenticated cannot SELECT player_rating_inputs');

-- Group A scoring game A: exactly Alice + Bob (Dave's missed and Alice's non-scoring pick excluded).
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.player_rating_inputs
     WHERE group_id = '00000000-0000-4000-8000-000000005301' AND season_year = 2093 $$,
  $$ VALUES (2) $$,
  '8. group A has 2 rating inputs (Alice win + Bob loss); missed + non-scoring excluded'
);

-- Alice's row surfaces the pick weight + settled outcome + season.
SELECT results_eq(
  $$ SELECT weight::text, outcome::text, season_year FROM public.player_rating_inputs
     WHERE group_id = '00000000-0000-4000-8000-000000005301'
       AND user_id = tests.get_supabase_uid('pr_alice') $$,
  $$ VALUES ('H', 'win', 2093) $$,
  '9. Alice input carries weight H, outcome win, season 2093'
);

-- Dave's auto-missed settlement (pick_id NULL) never appears (ADR-0032 §3).
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.player_rating_inputs
     WHERE user_id = tests.get_supabase_uid('pr_dave') $$,
  $$ VALUES (0) $$,
  '10. missed (pick_id NULL) settlements are excluded'
);

-- Non-scoring round game C is excluded (ADR-0016).
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.player_rating_inputs
     WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'pr-053-game-c') $$,
  $$ VALUES (0) $$,
  '11. non-scoring round game C is excluded'
);

-- Cross-group isolation: Carol (group B) never appears under group A.
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.player_rating_inputs
     WHERE group_id = '00000000-0000-4000-8000-000000005301'
       AND user_id = tests.get_supabase_uid('pr_carol') $$,
  $$ VALUES (0) $$,
  '12. Carol (group B) does not appear in group A inputs'
);

SELECT * FROM finish();
ROLLBACK;
