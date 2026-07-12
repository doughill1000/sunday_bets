-- 050_stats_team_book.sql
-- pgTAP tests for the two-sided team book matviews (issue #564):
--   stats_team_book          -- per (group, user, season, side, team) backed/faded ATS record
--   stats_team_book_alltime  -- the career-grain sibling (all seasons pooled)
--
-- Tests:
--   1-4.   Structure: both are matviews, each with its REFRESH ... CONCURRENTLY unique index.
--   5-10.  Grants: service_role can SELECT both; anon/authenticated cannot (ADR-0013).
--   11-14. Backed math: the picked team's record (a win, a loss, a push aggregate correctly).
--   15-18. Faded math: the OPPONENT's record — the fade side stats_accuracy_by_team never had.
--   19.    One backed row + one faded row per settled, placed pick (sum of decisions = 2 × picks).
--   20.    A team the player only backed never appears as a faded row for them (opponent-only).
--   21.    Non-scoring rounds and missed picks (pick_id NULL) are excluded.
--   22.    All-time pools the season rows (single-season fixture, so the backed record matches).
--   23-24. Cross-group isolation + opponent derivation: group B's Carol backed B, so she FADED A
--          (the opponent), and never shows up in group A's book.
--
-- Owns season year 2071 and the 0050_ group namespace to avoid colliding with other test files.

BEGIN;

SELECT plan(24);

-- ── Groups ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.groups (id, name) VALUES
    ('00000000-0000-4000-8000-000000005001', 'Team Book Group A (050)'),
    ('00000000-0000-4000-8000-000000005002', 'Team Book Group B (050)')
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT tests.create_supabase_user('tb_alice');
SELECT tests.create_supabase_user('tb_carol');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('tb_alice'), 'player', 'TB Alice'),
  (tests.get_supabase_uid('tb_carol'), 'player', 'TB Carol')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000005001', tests.get_supabase_uid('tb_alice'), 'member'),
  ('00000000-0000-4000-8000-000000005002', tests.get_supabase_uid('tb_carol'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ── Season (2071) / week 5 (scoring) / week 6 (non-scoring) ─────────────────────
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2071) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2071),
   5, '2071-10-01 00:00:00+00', '2071-10-08 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2071),
   6, '2071-10-08 00:00:00+00', '2071-10-15 00:00:00+00', false)  -- non-scoring round
ON CONFLICT (season_id, week_number) DO NOTHING;

-- ── Teams ──────────────────────────────────────────────────────────────────────
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('TB_A', 'Team Book A', 'TBA'),
  ('TB_B', 'Team Book B', 'TBB'),
  ('TB_C', 'Team Book C', 'TBC'),
  ('TB_D', 'Team Book D', 'TBD')
ON CONFLICT (external_key) DO NOTHING;

-- ── Games (each a distinct week+matchup) ────────────────────────────────────────
--   Every week-5 game is a distinct unordered matchup (uq_games_matchup):
--   tb-g1 (wk5): TBA vs TBB  -- Alice backs TBA (fades TBB), WIN
--   tb-g2 (wk5): TBA vs TBC  -- Alice backs TBA (fades TBC), LOSS
--   tb-g3 (wk5): TBB vs TBD  -- Alice backs TBD (fades TBB), WIN
--   tb-g4 (wk5): TBC vs TBD  -- Alice backs TBD (fades TBC), PUSH
--   tb-g5 (wk5): TBA vs TBD  -- Alice MISSES (settlement with pick_id NULL) -> excluded
--   tb-g6 (wk6, non-scoring): TBA vs TBC  -- Alice backs TBA -> excluded
INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id, gk.external_game_id, '2071-10-03 17:00:00+00'::timestamptz,
  home.id, away.id, 'final', '{"home": 24, "away": 20}'::jsonb
FROM (VALUES
  ('tb-g1', 5, 'TB_A', 'TB_B'),
  ('tb-g2', 5, 'TB_A', 'TB_C'),
  ('tb-g3', 5, 'TB_B', 'TB_D'),
  ('tb-g4', 5, 'TB_C', 'TB_D'),
  ('tb-g5', 5, 'TB_A', 'TB_D'),
  ('tb-g6', 6, 'TB_A', 'TB_C')
) gk(external_game_id, week_number, home_key, away_key)
JOIN public.weeks w
  ON w.week_number = gk.week_number
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2071)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- ── Picks (locked line stated on the picked team; value is irrelevant to the book) ──────────────
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
SELECT
  p.group_id, tests.get_supabase_uid(p.user_name), g.id, pick.id, 'M'::public.weight_enum,
  g.commence_time - interval '1 hour', pick.id, -3.0, tests.get_supabase_uid(p.user_name)
FROM (VALUES
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g1', 'TB_A'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g2', 'TB_A'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g3', 'TB_D'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g4', 'TB_D'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g6', 'TB_A'),  -- non-scoring
  ('00000000-0000-4000-8000-000000005002'::uuid, 'tb_carol', 'tb-g1', 'TB_B')   -- group B
) p(group_id, user_name, game_key, picked_key)
JOIN public.games g ON g.external_game_id = p.game_key
JOIN public.teams pick ON pick.external_key = p.picked_key
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- ── Settlements ─────────────────────────────────────────────────────────────────
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT s.group_id, tests.get_supabase_uid(s.user_name), p.game_id, p.id, s.points_delta,
       s.outcome::public.pick_outcome, '2071-10-04 00:00:00+00'
FROM (VALUES
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g1',  1, 'win'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g2', -1, 'loss'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g3',  1, 'win'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g4',  0, 'push'),
  ('00000000-0000-4000-8000-000000005001'::uuid, 'tb_alice', 'tb-g6',  1, 'win'),   -- non-scoring
  ('00000000-0000-4000-8000-000000005002'::uuid, 'tb_carol', 'tb-g1',  1, 'win')
) s(group_id, user_name, game_key, points_delta, outcome)
JOIN public.games g ON g.external_game_id = s.game_key
JOIN public.picks p ON p.group_id = s.group_id
  AND p.user_id = tests.get_supabase_uid(s.user_name) AND p.game_id = g.id
ON CONFLICT (group_id, user_id, game_id) DO UPDATE
  SET points_delta = EXCLUDED.points_delta, outcome = EXCLUDED.outcome, graded_at = EXCLUDED.graded_at;

-- Missed pick: a settlement on a scoring-week game with NO placed pick (pick_id NULL). It carries
-- no team, so it must never emit a team book row.
INSERT INTO public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
SELECT '00000000-0000-4000-8000-000000005001'::uuid, tests.get_supabase_uid('tb_alice'),
       g.id, NULL, -1, NULL, '2071-10-04 00:00:00+00'
FROM public.games g WHERE g.external_game_id = 'tb-g5'
ON CONFLICT (group_id, user_id, game_id) DO NOTHING;

-- Refresh so the matviews pick up the new settlements.
SELECT public.refresh_leaderboard_stats();

-- ── 1-4: Structure ──────────────────────────────────────────────────────────────
SELECT has_materialized_view('public', 'stats_team_book',
  '1. stats_team_book is a materialized view');
SELECT has_materialized_view('public', 'stats_team_book_alltime',
  '2. stats_team_book_alltime is a materialized view');
SELECT has_index('public', 'stats_team_book', 'uq_stats_team_book',
  '3. stats_team_book has its unique index for REFRESH ... CONCURRENTLY');
SELECT has_index('public', 'stats_team_book_alltime', 'uq_stats_team_book_alltime',
  '4. stats_team_book_alltime has its unique index');

-- ── 5-10: Grants (service_role only) ──────────────────────────────────────────────
SELECT ok(has_table_privilege('service_role', 'public.stats_team_book', 'select'),
  '5. service_role can SELECT stats_team_book');
SELECT ok(NOT has_table_privilege('anon', 'public.stats_team_book', 'select'),
  '6. anon cannot SELECT stats_team_book');
SELECT ok(NOT has_table_privilege('authenticated', 'public.stats_team_book', 'select'),
  '7. authenticated cannot SELECT stats_team_book');
SELECT ok(has_table_privilege('service_role', 'public.stats_team_book_alltime', 'select'),
  '8. service_role can SELECT stats_team_book_alltime');
SELECT ok(NOT has_table_privilege('anon', 'public.stats_team_book_alltime', 'select'),
  '9. anon cannot SELECT stats_team_book_alltime');
SELECT ok(NOT has_table_privilege('authenticated', 'public.stats_team_book_alltime', 'select'),
  '10. authenticated cannot SELECT stats_team_book_alltime');

-- ── 11-14: Backed math (Alice, season 2071, group A) ──────────────────────────────
SELECT results_eq(
  $$ SELECT decisions, wins, losses, pushes, points, accuracy
     FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'backed' AND team_short_name = 'TBA' $$,
  $$ VALUES (2, 1, 1, 0, 0, 0.5000::numeric) $$,
  '11. backed TBA: 1-1 across g1 win + g2 loss, cover 0.5');

SELECT results_eq(
  $$ SELECT decisions, wins, losses, pushes, points, accuracy
     FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'backed' AND team_short_name = 'TBD' $$,
  $$ VALUES (2, 1, 0, 1, 1, 1.0000::numeric) $$,
  '12. backed TBD: 1-0-1 (g3 win + g4 push), cover 1.0 (push excluded from the rate)');

SELECT is(
  (SELECT count(*)::int FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'backed'),
  2,
  '13. Alice backed exactly two teams (TBA, TBD)');

SELECT is(
  (SELECT count(*)::int FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'faded'),
  2,
  '14. Alice faded exactly two teams (TBB, TBC)');

-- ── 15-18: Faded math — the opponent side ─────────────────────────────────────────
SELECT results_eq(
  $$ SELECT decisions, wins, losses, pushes, points, accuracy
     FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'faded' AND team_short_name = 'TBB' $$,
  $$ VALUES (2, 2, 0, 0, 2, 1.0000::numeric) $$,
  '15. faded TBB: 2-0 (g1 backing TBA + g3 backing TBD both won), cover 1.0 against them');

SELECT results_eq(
  $$ SELECT decisions, wins, losses, pushes, points, accuracy
     FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'faded' AND team_short_name = 'TBC' $$,
  $$ VALUES (2, 0, 1, 1, -1, 0.0000::numeric) $$,
  '16. faded TBC: 0-1-1 (g2 loss + g4 push), cover 0.0 against them');

SELECT is(
  (SELECT count(*)::int FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'faded' AND team_short_name = 'TBA'),
  0,
  '17. Alice never fades TBA — she only ever backed it (faded = opponent, not the pick)');

SELECT is(
  (SELECT count(*)::int FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'backed' AND team_short_name = 'TBB'),
  0,
  '18. Alice never backs TBB — she only ever faded it');

-- ── 19: One backed + one faded row per settled placed pick ────────────────────────
-- Four placed scoring picks (g1-g4) -> 8 sided rows -> sum(decisions) = 8. (g5 missed and g6
-- non-scoring contribute nothing, which also proves both exclusions.)
SELECT is(
  (SELECT sum(decisions)::int FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice') AND season_year = 2071),
  8,
  '19. exactly one backed + one faded row per settled placed pick (4 picks -> 8 decisions)');

-- ── 20: Non-scoring + missed exclusion, spelled out ───────────────────────────────
-- If g6 (non-scoring) counted, backed TBA would be 4; if g5 (missed) counted it would add a row.
SELECT is(
  (SELECT decisions FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND season_year = 2071 AND side = 'backed' AND team_short_name = 'TBA'),
  2,
  '20. backed TBA stays 2 — the non-scoring g6 pick and the missed g5 settlement are excluded');

-- ── 21: All-time pools the season rows (single season, so backed TBA matches) ─────
SELECT results_eq(
  $$ SELECT decisions, wins, losses, pushes, accuracy
     FROM public.stats_team_book_alltime
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND side = 'backed' AND team_short_name = 'TBA' $$,
  $$ VALUES (2, 1, 1, 0, 0.5000::numeric) $$,
  '21. all-time backed TBA pools every season (matches the single-season row here)');

-- ── 22: All-time faded side present too ───────────────────────────────────────────
SELECT results_eq(
  $$ SELECT decisions, wins, accuracy
     FROM public.stats_team_book_alltime
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_alice')
       AND side = 'faded' AND team_short_name = 'TBB' $$,
  $$ VALUES (2, 2, 1.0000::numeric) $$,
  '22. all-time faded TBB carries the fade side into the career book');

-- ── 23-24: Cross-group isolation + opponent derivation (Carol, group B) ───────────
SELECT is(
  (SELECT count(*)::int FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005001'
       AND user_id = tests.get_supabase_uid('tb_carol')),
  0,
  '23. Carol (group B) never appears in group A''s team book');

SELECT results_eq(
  $$ SELECT side, team_short_name, decisions, wins
     FROM public.stats_team_book
     WHERE group_id = '00000000-0000-4000-8000-000000005002'
       AND user_id = tests.get_supabase_uid('tb_carol') AND season_year = 2071
     ORDER BY side $$,
  $$ VALUES ('backed', 'TBB', 1, 1), ('faded', 'TBA', 1, 1) $$,
  '24. Carol backed TBB, so she FADED TBA (its opponent) — one row each, correct sides');

SELECT * FROM finish();
ROLLBACK;
