-- 029_group_pick_consensus.sql
-- pgTAP tests for the group_pick_consensus materialized view (issue #294).
--
-- Tests:
--   1. Matview exists and is materialized.
--   2. Unique index exists (required for REFRESH ... CONCURRENTLY).
--   3. service_role can SELECT; anon/authenticated cannot.
--   4. Cross-group isolation: group B picks never appear in group A results.
--   5. Consensus values are correct (100% consensus on one team, 50/50 split).
--   6. is_minority flag is correct.
--   7. Non-scoring weeks are excluded.
--
-- This suite owns season year 2097, week 3 to avoid colliding with other test files.

BEGIN;

SELECT plan(14);

-- ── Stable UUIDs (029_ namespace) ────────────────────────────────────────────

DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000002901', 'Consensus Test Group A (029)'),
    ('00000000-0000-4000-8000-000000002902', 'Consensus Test Group B (029)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('cs_alice');
SELECT tests.create_supabase_user('cs_bob');
SELECT tests.create_supabase_user('cs_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('cs_alice'), 'player', 'CS Alice'),
  (tests.get_supabase_uid('cs_bob'),   'player', 'CS Bob'),
  (tests.get_supabase_uid('cs_carol'), 'player', 'CS Carol')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Group A: Alice + Bob.  Group B: Carol only (isolation check).
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000002901', tests.get_supabase_uid('cs_alice'), 'member'),
  ('00000000-0000-4000-8000-000000002901', tests.get_supabase_uid('cs_bob'),   'member'),
  ('00000000-0000-4000-8000-000000002902', tests.get_supabase_uid('cs_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season (2097) / week 3 (scoring) / week 4 (non-scoring)
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2097) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  (
    (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2097),
    3,
    '2097-09-15 00:00:00+00',
    '2097-09-22 00:00:00+00',
    true
  ),
  (
    (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2097),
    4,
    '2097-09-22 00:00:00+00',
    '2097-09-29 00:00:00+00',
    false   -- non-scoring round
  )
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('CS_HOME', 'CS Home', 'CSH'),
  ('CS_AWAY', 'CS Away', 'CSA')
ON CONFLICT (external_key) DO NOTHING;

-- Game A (week 3, scoring): Alice picks home, Bob picks away (50/50 split)
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id,
  'cs-029-game-a',
  '2097-09-17 18:00:00+00',
  home.id, away.id,
  'final',
  '{"home": 28, "away": 14}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'CS_HOME'
JOIN public.teams away ON away.external_key = 'CS_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2097)
  AND w.week_number = 3
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line)
SELECT g.id, 'fanduel', home.id, -3.5, true
FROM public.games g
JOIN public.teams home ON home.external_key = 'CS_HOME'
WHERE g.external_game_id = 'cs-029-game-a'
ON CONFLICT DO NOTHING;

-- Game B (week 4, NON-scoring): should be excluded from the matview
INSERT INTO public.games (
  week_id, external_game_id, commence_time,
  home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id,
  'cs-029-game-b',
  '2097-09-24 18:00:00+00',
  home.id, away.id,
  'final',
  '{"home": 10, "away": 21}'::jsonb
FROM public.weeks w
JOIN public.teams home ON home.external_key = 'CS_HOME'
JOIN public.teams away ON away.external_key = 'CS_AWAY'
WHERE w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2097)
  AND w.week_number = 4
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line)
SELECT g.id, 'fanduel', home.id, -3.5, true
FROM public.games g
JOIN public.teams home ON home.external_key = 'CS_HOME'
WHERE g.external_game_id = 'cs-029-game-b'
ON CONFLICT DO NOTHING;

-- ── Picks ─────────────────────────────────────────────────────────────────────
-- Group A game A: Alice → home, Bob → away (50/50 split)
-- Group B game A: Carol → home (100% consensus)
-- Group A game B (non-scoring): Alice → home (should be excluded)

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
  3.5,
  p.user_id
FROM (VALUES
  -- Group A, game A
  ('00000000-0000-4000-8000-000000002901'::uuid, tests.get_supabase_uid('cs_alice'), 'cs-029-game-a', 'CS_HOME'),
  ('00000000-0000-4000-8000-000000002901'::uuid, tests.get_supabase_uid('cs_bob'),   'cs-029-game-a', 'CS_AWAY'),
  -- Group B, game A
  ('00000000-0000-4000-8000-000000002902'::uuid, tests.get_supabase_uid('cs_carol'), 'cs-029-game-a', 'CS_HOME'),
  -- Group A, game B (non-scoring)
  ('00000000-0000-4000-8000-000000002901'::uuid, tests.get_supabase_uid('cs_alice'), 'cs-029-game-b', 'CS_HOME')
) p(group_id, user_id, game_key, team_key)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams team ON team.external_key = p.team_key
JOIN public.teams home ON home.external_key = 'CS_HOME'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ───────────────────────────────────────────────────────────────

INSERT INTO public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
SELECT
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  CASE
    WHEN p.picked_team_id = (SELECT id FROM public.teams WHERE external_key = 'CS_HOME') THEN  3
    ELSE -1
  END,
  CASE
    WHEN p.picked_team_id = (SELECT id FROM public.teams WHERE external_key = 'CS_HOME') THEN 'win'::public.pick_outcome
    ELSE 'loss'::public.pick_outcome
  END,
  '2097-09-17 22:00:00+00'
FROM public.picks p
WHERE p.game_id IN (
  SELECT id FROM public.games WHERE external_game_id IN ('cs-029-game-a', 'cs-029-game-b')
)
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta,
      outcome      = EXCLUDED.outcome,
      graded_at    = EXCLUDED.graded_at;

-- Refresh so assertions see the new settlements.
SELECT public.refresh_leaderboard_stats();

-- ── 1–2: Structural checks ────────────────────────────────────────────────────

SELECT has_materialized_view('public', 'group_pick_consensus',
  '1. group_pick_consensus is a materialized view');

SELECT has_index('public', 'group_pick_consensus', 'uq_group_pick_consensus',
  '2. unique index exists for REFRESH ... CONCURRENTLY');

-- ── 3: Grant checks ───────────────────────────────────────────────────────────

SELECT ok(
  has_table_privilege('service_role', 'public.group_pick_consensus', 'select'),
  '3a. service_role can SELECT group_pick_consensus'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.group_pick_consensus', 'select'),
  '3b. anon cannot SELECT group_pick_consensus'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.group_pick_consensus', 'select'),
  '3c. authenticated cannot SELECT group_pick_consensus'
);

-- ── 4: Cross-group isolation ──────────────────────────────────────────────────

-- Group A contains Alice and Bob (not Carol).
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND season_year = 2097
  $$,
  $$ VALUES (2) $$,
  '4a. group A has 2 picks in game A (Alice + Bob)'
);

-- Group B contains only Carol.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002902'
      AND season_year = 2097
  $$,
  $$ VALUES (1) $$,
  '4b. group B has 1 pick (Carol only)'
);

-- Carol must never appear in group A.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND user_id = tests.get_supabase_uid('cs_carol')
  $$,
  $$ VALUES (0) $$,
  '4c. Carol (group B) does not appear in group A consensus'
);

-- ── 5: Consensus values ───────────────────────────────────────────────────────

-- Group A, game A: Alice picked home (1 of 2 pickers) → 50% consensus.
SELECT results_eq(
  $$
    SELECT consensus_pct
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND season_year = 2097
      AND user_id = tests.get_supabase_uid('cs_alice')
  $$,
  $$ VALUES (50.00::numeric) $$,
  '5a. Alice has 50% consensus (one of two pickers chose home)'
);

-- Group A, game A: Bob picked away (1 of 2 pickers) → 50% consensus.
SELECT results_eq(
  $$
    SELECT consensus_pct
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND season_year = 2097
      AND user_id = tests.get_supabase_uid('cs_bob')
  $$,
  $$ VALUES (50.00::numeric) $$,
  '5b. Bob has 50% consensus (one of two pickers chose away)'
);

-- Group B, game A: Carol is the only picker → 100% consensus.
SELECT results_eq(
  $$
    SELECT consensus_pct
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002902'
      AND season_year = 2097
      AND user_id = tests.get_supabase_uid('cs_carol')
  $$,
  $$ VALUES (100.00::numeric) $$,
  '5c. Carol (solo picker) has 100% consensus'
);

-- ── 6: is_minority flag ───────────────────────────────────────────────────────

-- At exactly 50/50, neither picker is a minority (consensus_pct = 50, not < 50).
SELECT results_eq(
  $$
    SELECT is_minority
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND season_year = 2097
      AND user_id = tests.get_supabase_uid('cs_alice')
  $$,
  $$ VALUES (false) $$,
  '6a. Alice is not a minority at exactly 50/50'
);

SELECT results_eq(
  $$
    SELECT is_minority
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND season_year = 2097
      AND user_id = tests.get_supabase_uid('cs_bob')
  $$,
  $$ VALUES (false) $$,
  '6b. Bob is not a minority at exactly 50/50'
);

-- ── 7: Non-scoring rounds excluded ───────────────────────────────────────────

-- Game B is in week 4 (is_scoring = false) — must not appear in the matview.
SELECT results_eq(
  $$
    SELECT count(*)::int
    FROM public.group_pick_consensus
    WHERE group_id = '00000000-0000-4000-8000-000000002901'
      AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'cs-029-game-b')
  $$,
  $$ VALUES (0) $$,
  '7. Non-scoring round (week 4) is excluded from group_pick_consensus'
);

SELECT * FROM finish();
ROLLBACK;
