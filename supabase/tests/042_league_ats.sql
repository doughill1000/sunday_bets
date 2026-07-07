-- 042_league_ats.sql
-- pgTAP tests for the league-wide team ATS cluster (issue #406, ADR-0013):
--   public.league_ats_base       (materialized view, game x team grain)
--   public.league_ats_team       (plain view over base)
--   public.league_ats_fav_dog    (plain view over base)
--   public.league_ats_home_away  (plain view over base)
--   public.league_ats_situational (plain view over base -- pick-card nugget, issue #406 PR 2)
--
-- Verifies:
--   1. Structural: base is a matview with the unique index REFRESH ... CONCURRENTLY needs;
--      the three aggregates are plain views.
--   2. Grants: service_role can SELECT all four; anon and authenticated cannot (matviews
--      carry no RLS, so reads are service-role only per ADR-0013).
--   3. refresh_leaderboard_stats() (which now refreshes league_ats_base) runs inside a txn.
--   4. Cover math against a hand-checked fixture: a home-favorite cover, an underdog cover,
--      a push, an away-favorite cover, and a pick'em (excluded from fav/dog, counted overall).
--   5. Exclusions: a game with no final score, a game with no line, and a non-scoring week
--      (ADR-0016) all drop out of the matview.
--   6. Line selection: the closing line is preferred over a divergent active line, and a
--      historical-style single active line (no closing flag) still qualifies (the 2022-24
--      import path).
--   7. league_ats_situational (PR 2): the crossed home/away x favorite/underdog quadrants
--      read correctly (a home-favorite and an away-favorite quadrant), and a pick'em-only
--      team has no quadrant row (is_favorite null is excluded).
--
-- League-wide + group-independent: this surface has no group_id / user_id, so unlike the
-- stats matviews there are no players, picks, or settlements in the fixture -- only
-- games + game_lines + final scores. Owns NFL season year 2090 to avoid colliding with
-- seed data and other suites (each pgTAP file runs in its own BEGIN/ROLLBACK).

BEGIN;

SELECT plan(36);

-- ── Structural checks ─────────────────────────────────────────────────────────

SELECT has_materialized_view('public', 'league_ats_base',
  '1. league_ats_base is a materialized view');
SELECT has_index('public', 'league_ats_base', 'uq_league_ats_base',
  '2. unique index exists for REFRESH ... CONCURRENTLY');
SELECT has_view('public', 'league_ats_team', '3. league_ats_team is a plain view');
SELECT has_view('public', 'league_ats_fav_dog', '4. league_ats_fav_dog is a plain view');
SELECT has_view('public', 'league_ats_home_away', '5. league_ats_home_away is a plain view');

-- ── Grant checks (service_role only) ────────────────────────────────────────────

SELECT ok(has_table_privilege('service_role', 'public.league_ats_base', 'select'),
  '6. service_role can SELECT league_ats_base');
SELECT ok(NOT has_table_privilege('anon', 'public.league_ats_base', 'select'),
  '7. anon cannot SELECT league_ats_base');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_base', 'select'),
  '8. authenticated cannot SELECT league_ats_base');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_team', 'select'),
  '9. service_role can SELECT league_ats_team');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_team', 'select'),
  '10. authenticated cannot SELECT league_ats_team');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_fav_dog', 'select'),
  '11. service_role can SELECT league_ats_fav_dog');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_fav_dog', 'select'),
  '12. authenticated cannot SELECT league_ats_fav_dog');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_home_away', 'select'),
  '13. service_role can SELECT league_ats_home_away');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_home_away', 'select'),
  '14. authenticated cannot SELECT league_ats_home_away');

-- ── Fixture: season 2090, scoring week 1 + non-scoring week 2 ───────────────────

INSERT INTO public.seasons (league, year) VALUES ('NFL', 2090)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2090),
    1, '2090-09-10 00:00:00+00', '2090-09-17 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2090),
    2, '2090-09-17 00:00:00+00', '2090-09-24 00:00:00+00', false)  -- non-scoring (ADR-0016)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Nine distinct home/away pairs (uq_games_matchup is unique per week + pair).
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('LAT_H1','LAT Home 1','LH1'), ('LAT_A1','LAT Away 1','LA1'),
  ('LAT_H2','LAT Home 2','LH2'), ('LAT_A2','LAT Away 2','LA2'),
  ('LAT_H3','LAT Home 3','LH3'), ('LAT_A3','LAT Away 3','LA3'),
  ('LAT_H4','LAT Home 4','LH4'), ('LAT_A4','LAT Away 4','LA4'),
  ('LAT_H5','LAT Home 5','LH5'), ('LAT_A5','LAT Away 5','LA5'),
  ('LAT_H6','LAT Home 6','LH6'), ('LAT_A6','LAT Away 6','LA6'),
  ('LAT_H7','LAT Home 7','LH7'), ('LAT_A7','LAT Away 7','LA7'),
  ('LAT_H8','LAT Home 8','LH8'), ('LAT_A8','LAT Away 8','LA8'),
  ('LAT_H9','LAT Home 9','LH9'), ('LAT_A9','LAT Away 9','LA9')
ON CONFLICT (external_key) DO NOTHING;

-- Games. final_scores null for the no-score exclusion (g6). g8 sits in the non-scoring
-- week. Hand-checked margins (ats_margin_at_lock = (home-away) then -abs(spread) if the
-- favorite is home, +abs(spread) if away):
--   g1 home -7, 28-14: +14-7=+7  -> home (fav) covers
--   g2 home -7, 20-17: +3-7=-4   -> away (dog) covers
--   g3 home -3, 24-21: +3-3=0    -> push
--   g4 away -6, 10-27: -17+6=-11 -> away (fav) covers
--   g5 pick'em 0, 30-20: +10     -> home covers, is_favorite null
--   g9 closing -1 (vs active -10), 24-21: +3-1=+2 -> home covers (proves closing wins)
--   g10 active-only -3, 28-14: +14-3=+11 -> home covers (proves active fallback)
INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT
  w.id, gk.ext, '2090-09-13 18:00:00+00', home.id, away.id, gk.status, gk.final_scores::jsonb
FROM (VALUES
  ('lat-g1', 1, 'LAT_H1', 'LAT_A1', 'final',     '{"home":28,"away":14}'),
  ('lat-g2', 1, 'LAT_H2', 'LAT_A2', 'final',     '{"home":20,"away":17}'),
  ('lat-g3', 1, 'LAT_H3', 'LAT_A3', 'final',     '{"home":24,"away":21}'),
  ('lat-g4', 1, 'LAT_H4', 'LAT_A4', 'final',     '{"home":10,"away":27}'),
  ('lat-g5', 1, 'LAT_H5', 'LAT_A5', 'final',     '{"home":30,"away":20}'),
  ('lat-g6', 1, 'LAT_H6', 'LAT_A6', 'scheduled', NULL),
  ('lat-g7', 1, 'LAT_H7', 'LAT_A7', 'final',     '{"home":21,"away":20}'),
  ('lat-g8', 2, 'LAT_H8', 'LAT_A8', 'final',     '{"home":31,"away":10}'),
  ('lat-g9', 1, 'LAT_H8', 'LAT_A8', 'final',     '{"home":24,"away":21}'),
  ('lat-g10',1, 'LAT_H9', 'LAT_A9', 'final',     '{"home":28,"away":14}')
) gk(ext, week_number, home_key, away_key, status, final_scores)
JOIN public.weeks w
  ON w.week_number = gk.week_number
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2090)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- Standard single fanduel line (both active + closing) for g1-g6 and g8. g7 gets NO line
-- (the no-line exclusion). g9 and g10 get bespoke lines below.
INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', st.id, ln.spread_value, true, true, '2090-09-13 17:00:00+00'
FROM (VALUES
  ('lat-g1', 'LAT_H1', -7),
  ('lat-g2', 'LAT_H2', -7),
  ('lat-g3', 'LAT_H3', -3),
  ('lat-g4', 'LAT_A4', -6),
  ('lat-g5', 'LAT_H5',  0),
  ('lat-g6', 'LAT_H6', -3),
  ('lat-g8', 'LAT_H8', -7)
) ln(ext, spread_key, spread_value)
JOIN public.games g ON g.external_game_id = ln.ext
JOIN public.teams st ON st.external_key = ln.spread_key;

-- g9: divergent active (-10, earlier) vs closing (-1, later) line, both fanduel. The view
-- must prefer the closing line, which flips g9's home result from loss to win.
INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', st.id, v.spread_value, v.is_active, v.is_closing, v.fetched_at::timestamptz
FROM (VALUES
  (-10::numeric, true,  false, '2090-09-10 12:00:00+00'),
  (-1::numeric,  false, true,  '2090-09-13 17:30:00+00')
) v(spread_value, is_active, is_closing, fetched_at)
JOIN public.games g ON g.external_game_id = 'lat-g9'
JOIN public.teams st ON st.external_key = 'LAT_H8';

-- g10: historical-style single active-only line (no closing flag), mirroring the 2022-24
-- import. Must still qualify via the is_active_line fallback.
INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', st.id, -3, true, false, '2090-09-13 17:00:00+00'
FROM public.games g
JOIN public.teams st ON st.external_key = 'LAT_H9'
WHERE g.external_game_id = 'lat-g10';

-- Matviews only reflect base-table changes after a refresh (ADR-0013). This also asserts
-- refresh_leaderboard_stats() -- which now refreshes league_ats_base -- runs inside a txn.
SELECT lives_ok(
  $$ SELECT public.refresh_leaderboard_stats() $$,
  '15. refresh_leaderboard_stats() (incl. league_ats_base) runs inside a transaction'
);

-- ── Base inclusion / exclusion ──────────────────────────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM public.league_ats_base WHERE season_year = 2090),
  14,
  '16. base has 14 rows for 2090 (7 qualifying games x 2 perspectives; g6/g7/g8 excluded)'
);

SELECT is(
  (SELECT count(*)::int FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
    WHERE g.external_game_id = 'lat-g6'),
  0,
  '17. game with no final score (g6) is excluded'
);

SELECT is(
  (SELECT count(*)::int FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
    WHERE g.external_game_id = 'lat-g7'),
  0,
  '18. game with no line (g7) is excluded'
);

SELECT is(
  (SELECT count(*)::int FROM public.league_ats_base WHERE season_year = 2090 AND week_number = 2),
  0,
  '19. non-scoring week 2 (g8, ADR-0016) is excluded'
);

-- ── Cover math (base, game x team) ──────────────────────────────────────────────

SELECT is(
  (SELECT ats_result FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
     JOIN public.teams t ON t.id = b.team_id
    WHERE g.external_game_id = 'lat-g1' AND t.external_key = 'LAT_H1'),
  'win',
  '20. g1 home favorite covers (ATS win)'
);

SELECT results_eq(
  $$ SELECT t.external_key, b.ats_result
       FROM public.league_ats_base b
       JOIN public.games g ON g.id = b.game_id
       JOIN public.teams t ON t.id = b.team_id
      WHERE g.external_game_id = 'lat-g2'
      ORDER BY t.external_key $$,
  $$ VALUES ('LAT_A2', 'win'), ('LAT_H2', 'loss') $$,
  '21. g2 underdog (away) covers, favorite (home) does not'
);

SELECT is(
  (SELECT count(*)::int FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
    WHERE g.external_game_id = 'lat-g3' AND b.ats_result = 'push'),
  2,
  '22. g3 is a push for both perspectives'
);

SELECT results_eq(
  $$ SELECT b.is_favorite, b.ats_result
       FROM public.league_ats_base b
       JOIN public.games g ON g.id = b.game_id
       JOIN public.teams t ON t.id = b.team_id
      WHERE g.external_game_id = 'lat-g4' AND t.external_key = 'LAT_A4' $$,
  $$ VALUES (true, 'win') $$,
  '23. g4 away favorite covers (is_favorite true, ATS win)'
);

SELECT is(
  (SELECT count(*)::int FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
    WHERE g.external_game_id = 'lat-g5' AND b.is_favorite IS NULL),
  2,
  '24. g5 pick''em has NULL is_favorite for both perspectives'
);

SELECT is(
  (SELECT ats_result FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
     JOIN public.teams t ON t.id = b.team_id
    WHERE g.external_game_id = 'lat-g9' AND t.external_key = 'LAT_H8'),
  'win',
  '25. g9 uses the closing line (-1), not the active line (-10): home covers'
);

SELECT is(
  (SELECT ats_result FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
     JOIN public.teams t ON t.id = b.team_id
    WHERE g.external_game_id = 'lat-g10' AND t.external_key = 'LAT_H9'),
  'win',
  '26. g10 qualifies via the active-line fallback (no closing flag): home covers'
);

-- ── Aggregate views ──────────────────────────────────────────────────────────────

-- Week 1 favorites: covers = g1,g4,g9,g10 (4); underdog cover = g2 (1); push = g3 (1).
-- g5 (pick'em) has no favorite row and is excluded.
SELECT results_eq(
  $$ SELECT games, favorite_covers, underdog_covers, pushes
       FROM public.league_ats_fav_dog
      WHERE season_year = 2090 AND week_number = 1 $$,
  $$ VALUES (6, 4, 1, 1) $$,
  '27. fav/dog week 1: 6 games w/ a favorite, 4 fav covers, 1 dog cover, 1 push'
);

-- Home perspective across the 7 qualifying games: covers g1,g5,g9,g10 (4); losses g2,g4 (2);
-- push g3 (1). Home SU wins everywhere except g4 (6).
SELECT results_eq(
  $$ SELECT home_games, home_ats_covers, home_ats_losses, home_ats_pushes, home_su_wins
       FROM public.league_ats_home_away
      WHERE season_year = 2090 $$,
  $$ VALUES (7, 4, 2, 1, 6) $$,
  '28. home/away: 7 home games, 4 home ATS covers, 2 losses, 1 push, 6 home SU wins'
);

-- Per-team splits. H1 played one game as a home favorite and covered (ATS + SU win),
-- so its overall, home, and favorite ATS records each read 1-0-0.
SELECT results_eq(
  $$ SELECT tm.games, tm.ats_wins, tm.ats_losses, tm.home_ats_wins, tm.fav_ats_wins, tm.su_wins
       FROM public.league_ats_team tm
       JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.season_year = 2090 AND t.external_key = 'LAT_H1' $$,
  $$ VALUES (1, 1, 0, 1, 1, 1) $$,
  '29. league_ats_team: home favorite H1 reads 1 game, ATS/home/fav win, SU win'
);

-- A4 covered as an away favorite, so its away-split and favorite-split ATS wins both land.
SELECT results_eq(
  $$ SELECT tm.games, tm.ats_wins, tm.away_ats_wins, tm.fav_ats_wins, tm.su_wins
       FROM public.league_ats_team tm
       JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.season_year = 2090 AND t.external_key = 'LAT_A4' $$,
  $$ VALUES (1, 1, 1, 1, 1) $$,
  '30. league_ats_team: away favorite A4 reads away-split + fav-split ATS win, SU win'
);

-- ── Situational quadrants (league_ats_situational, PR 2) ─────────────────────────

SELECT has_view('public', 'league_ats_situational',
  '31. league_ats_situational is a plain view');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_situational', 'select'),
  '32. service_role can SELECT league_ats_situational');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_situational', 'select'),
  '33. authenticated cannot SELECT league_ats_situational');

-- H1 played g1 as a home favorite and covered → its (home, favorite) quadrant is 1-0-0.
SELECT results_eq(
  $$ SELECT s.games, s.ats_wins, s.ats_losses, s.ats_pushes
       FROM public.league_ats_situational s
       JOIN public.teams t ON t.id = s.team_id
      WHERE s.season_year = 2090 AND t.external_key = 'LAT_H1'
        AND s.is_home = true AND s.is_favorite = true $$,
  $$ VALUES (1, 1, 0, 0) $$,
  '34. situational: H1 home-favorite quadrant reads 1-0-0'
);

-- A4 covered as an away favorite → its (away, favorite) quadrant is a win.
SELECT results_eq(
  $$ SELECT s.games, s.ats_wins
       FROM public.league_ats_situational s
       JOIN public.teams t ON t.id = s.team_id
      WHERE s.season_year = 2090 AND t.external_key = 'LAT_A4'
        AND s.is_home = false AND s.is_favorite = true $$,
  $$ VALUES (1, 1) $$,
  '35. situational: A4 away-favorite quadrant reads a win'
);

-- H5 only played the pick'em g5 (is_favorite null), so it has no favorite/underdog quadrant.
SELECT is(
  (SELECT count(*)::int FROM public.league_ats_situational s
     JOIN public.teams t ON t.id = s.team_id
    WHERE s.season_year = 2090 AND t.external_key = 'LAT_H5'),
  0,
  '36. situational: a pick''em-only team (H5) has no quadrant row'
);

SELECT * FROM finish();
ROLLBACK;
