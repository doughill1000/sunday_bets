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

SELECT plan(68);

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

-- ══════════════════════════════════════════════════════════════════════════════════
-- #425 League tab v2: widened base columns, teams division/conference, five new views
-- ══════════════════════════════════════════════════════════════════════════════════

-- ── Structural: new columns + new views exist ──────────────────────────────────────

SELECT has_column('public', 'teams', 'division', '37. teams.division column exists');
SELECT has_column('public', 'teams', 'conference', '38. teams.conference column exists');
SELECT has_column('public', 'league_ats_base', 'spread_value',
  '39. base exposes team-relative spread_value');
SELECT has_column('public', 'league_ats_base', 'margin', '40. base exposes team-relative margin');
SELECT has_column('public', 'league_ats_base', 'commence_time', '41. base carries commence_time');
SELECT has_column('public', 'league_ats_base', 'opponent_team_id',
  '42. base carries opponent_team_id');
SELECT has_view('public', 'league_ats_spread_buckets', '43. league_ats_spread_buckets is a view');
SELECT has_view('public', 'league_ats_quadrants', '44. league_ats_quadrants is a view');
SELECT has_view('public', 'league_ats_primetime', '45. league_ats_primetime is a view');
SELECT has_view('public', 'league_ats_divisional', '46. league_ats_divisional is a view');
SELECT has_view('public', 'league_ats_streaks', '47. league_ats_streaks is a view');

-- ── Grants (service_role only) for the five new views ──────────────────────────────

SELECT ok(has_table_privilege('service_role', 'public.league_ats_spread_buckets', 'select'),
  '48. service_role can SELECT league_ats_spread_buckets');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_spread_buckets', 'select'),
  '49. authenticated cannot SELECT league_ats_spread_buckets');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_quadrants', 'select'),
  '50. service_role can SELECT league_ats_quadrants');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_quadrants', 'select'),
  '51. authenticated cannot SELECT league_ats_quadrants');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_primetime', 'select'),
  '52. service_role can SELECT league_ats_primetime');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_primetime', 'select'),
  '53. authenticated cannot SELECT league_ats_primetime');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_divisional', 'select'),
  '54. service_role can SELECT league_ats_divisional');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_divisional', 'select'),
  '55. authenticated cannot SELECT league_ats_divisional');
SELECT ok(has_table_privilege('service_role', 'public.league_ats_streaks', 'select'),
  '56. service_role can SELECT league_ats_streaks');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_ats_streaks', 'select'),
  '57. authenticated cannot SELECT league_ats_streaks');

-- ── Extra fixture ─────────────────────────────────────────────────────────────────
-- Divisional split reuses the 2090 games by assigning divisions to their teams (no new games,
-- so the 2090 counts above are untouched). g1/g3/g9 become divisional (same conf + div), while
-- g2/g4/g10 stay cross-division.
UPDATE public.teams AS t
SET division = v.division, conference = v.conference
FROM (VALUES
  ('LAT_H1', 'East', 'AFC'), ('LAT_A1', 'East', 'AFC'),   -- g1 divisional
  ('LAT_H3', 'North', 'AFC'), ('LAT_A3', 'North', 'AFC'), -- g3 divisional (push)
  ('LAT_H8', 'West', 'AFC'), ('LAT_A8', 'West', 'AFC'),   -- g9 divisional
  ('LAT_H2', 'East', 'AFC'), ('LAT_A2', 'West', 'NFC'),   -- g2 non-divisional
  ('LAT_H4', 'North', 'NFC'), ('LAT_A4', 'South', 'AFC'), -- g4 non-divisional
  ('LAT_H9', 'East', 'NFC'), ('LAT_A9', 'South', 'NFC')   -- g10 non-divisional
) AS v(external_key, division, conference)
WHERE t.external_key = v.external_key;

-- Season 2091: primetime slots. Five home-favorite (-7) games that all cover, one per slot,
-- plus a second Sunday-night game kicking off in January to prove DST-safe classification.
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('PT_TNF_H', 'PT TNF H', 'PTH'), ('PT_TNF_A', 'PT TNF A', 'PTA'),
  ('PT_SNF_H', 'PT SNF H', 'PSH'), ('PT_SNF_A', 'PT SNF A', 'PSA'),
  ('PT_MNF_H', 'PT MNF H', 'PMH'), ('PT_MNF_A', 'PT MNF A', 'PMA'),
  ('PT_DAY_H', 'PT DAY H', 'PDH'), ('PT_DAY_A', 'PT DAY A', 'PDA'),
  ('PT_JAN_H', 'PT JAN H', 'PJH'), ('PT_JAN_A', 'PT JAN A', 'PJA')
ON CONFLICT (external_key) DO NOTHING;

INSERT INTO public.seasons (league, year) VALUES ('NFL', 2091)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2091),
    1, '2091-09-10 00:00:00+00', '2091-09-22 00:00:00+00', true),
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2091),
    18, '2092-01-03 00:00:00+00', '2092-01-10 00:00:00+00', true)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- commence_time (UTC) chosen so the New-York wall clock lands in each slot. The January game
-- is 2092-01-07 01:20Z = Sun 2092-01-06 20:20 EST -- night in ET even though the UTC date is
-- the next (Monday) day, which is exactly the case `at time zone` must get right.
INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT w.id, gk.ext, gk.ct::timestamptz, home.id, away.id, 'final', gk.fs::jsonb
FROM (VALUES
  ('pt-tnf', 1,  '2091-09-14 00:15:00+00', 'PT_TNF_H', 'PT_TNF_A', '{"home":27,"away":10}'),
  ('pt-snf', 1,  '2091-09-17 00:20:00+00', 'PT_SNF_H', 'PT_SNF_A', '{"home":27,"away":10}'),
  ('pt-mnf', 1,  '2091-09-18 00:15:00+00', 'PT_MNF_H', 'PT_MNF_A', '{"home":27,"away":10}'),
  ('pt-day', 1,  '2091-09-16 17:00:00+00', 'PT_DAY_H', 'PT_DAY_A', '{"home":27,"away":10}'),
  ('pt-jan', 18, '2092-01-07 01:20:00+00', 'PT_JAN_H', 'PT_JAN_A', '{"home":27,"away":10}')
) gk(ext, week_number, ct, home_key, away_key, fs)
JOIN public.weeks w
  ON w.week_number = gk.week_number
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2091)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', g.home_team_id, -7, true, true, g.commence_time - interval '1 hour'
FROM public.games g
WHERE g.external_game_id IN ('pt-tnf', 'pt-snf', 'pt-mnf', 'pt-day', 'pt-jan');

-- Season 2092: ATS streaks. Two teams play five scoring weeks (home every week); scores + lines
-- are set so STRK_A runs win,win,win,loss,push (most-recent push -> streak resets to 0) and
-- STRK_B runs loss,push,win,win,win (an earlier push caps a 3-game cover streak).
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('STRK_A', 'Streak A', 'SKA'), ('STRK_B', 'Streak B', 'SKB'),
  ('STRK_OA', 'Streak Opp A', 'SOA'), ('STRK_OB', 'Streak Opp B', 'SOB')
ON CONFLICT (external_key) DO NOTHING;

INSERT INTO public.seasons (league, year) VALUES ('NFL', 2092)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
SELECT
  (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2092),
  n,
  '2092-09-01 00:00:00+00'::timestamptz + (n - 1) * interval '7 days',
  '2092-09-08 00:00:00+00'::timestamptz + (n - 1) * interval '7 days',
  true
FROM generate_series(1, 5) AS n
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT w.id, gk.ext, '2092-09-14 18:00:00+00', home.id, away.id, 'final', gk.fs::jsonb
FROM (VALUES
  ('sa-w1', 1, 'STRK_A', 'STRK_OA', '{"home":27,"away":14}'),
  ('sa-w2', 2, 'STRK_A', 'STRK_OA', '{"home":27,"away":14}'),
  ('sa-w3', 3, 'STRK_A', 'STRK_OA', '{"home":27,"away":14}'),
  ('sa-w4', 4, 'STRK_A', 'STRK_OA', '{"home":20,"away":17}'),
  ('sa-w5', 5, 'STRK_A', 'STRK_OA', '{"home":24,"away":21}'),
  ('sb-w1', 1, 'STRK_B', 'STRK_OB', '{"home":20,"away":17}'),
  ('sb-w2', 2, 'STRK_B', 'STRK_OB', '{"home":24,"away":21}'),
  ('sb-w3', 3, 'STRK_B', 'STRK_OB', '{"home":27,"away":14}'),
  ('sb-w4', 4, 'STRK_B', 'STRK_OB', '{"home":27,"away":14}'),
  ('sb-w5', 5, 'STRK_B', 'STRK_OB', '{"home":27,"away":14}')
) gk(ext, week_number, home_key, away_key, fs)
JOIN public.weeks w
  ON w.week_number = gk.week_number
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2092)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', g.home_team_id, ln.sv, true, true, '2092-09-14 17:00:00+00'
FROM (VALUES
  ('sa-w1', -3), ('sa-w2', -3), ('sa-w3', -3), ('sa-w4', -10), ('sa-w5', -3),
  ('sb-w1', -10), ('sb-w2', -3), ('sb-w3', -3), ('sb-w4', -3), ('sb-w5', -3)
) ln(ext, sv)
JOIN public.games g ON g.external_game_id = ln.ext;

-- Repopulate the base matview so it includes the 2091/2092 games (2090 rows are unchanged).
SELECT lives_ok(
  $$ SELECT public.refresh_leaderboard_stats() $$,
  '58. refresh_leaderboard_stats() re-materializes base with the new seasons'
);

-- ── Base widened columns (season 2090, g1) ─────────────────────────────────────────

SELECT results_eq(
  $$ SELECT t.external_key,
            b.spread_value,
            b.margin,
            (SELECT o.external_key FROM public.teams o WHERE o.id = b.opponent_team_id)
       FROM public.league_ats_base b
       JOIN public.games g ON g.id = b.game_id
       JOIN public.teams t ON t.id = b.team_id
      WHERE g.external_game_id = 'lat-g1'
      ORDER BY t.external_key $$,
  $$ VALUES ('LAT_A1', 7::numeric, -7::numeric, 'LAT_H1'),
            ('LAT_H1', -7::numeric, 7::numeric, 'LAT_A1') $$,
  '59. base widening: g1 spread_value/margin are team-relative and opponent_team_id resolves'
);

SELECT is(
  (SELECT DISTINCT b.commence_time
     FROM public.league_ats_base b
     JOIN public.games g ON g.id = b.game_id
    WHERE g.external_game_id = 'lat-g1'),
  '2090-09-13 18:00:00+00'::timestamptz,
  '60. base widening: commence_time is carried through from games'
);

-- ── Spread buckets (season 2090) ───────────────────────────────────────────────────
-- Favorite line sizes: g3/g9/g10 in 1-3 (g9 -1, g3 -3 push, g10 -3), g4 in 3.5-6.5 (-6),
-- g1/g2 in 7-9.5 (both -7), and the pick'em g5 in its own bucket.
SELECT results_eq(
  $$ SELECT bucket, games, favorite_covers, underdog_covers, pushes
       FROM public.league_ats_spread_buckets
      WHERE season_year = 2090
      ORDER BY bucket_order $$,
  $$ VALUES ('pickem', 1, 0, 0, 0),
            ('1-3', 3, 2, 0, 1),
            ('3.5-6.5', 1, 1, 0, 0),
            ('7-9.5', 2, 1, 1, 0) $$,
  '61. spread_buckets: favorite cover split by line size (incl. the pick''em bucket)'
);

-- ── Quadrants (season 2090) ────────────────────────────────────────────────────────
SELECT results_eq(
  $$ SELECT is_home, is_favorite, games, ats_wins, ats_losses, ats_pushes
       FROM public.league_ats_quadrants
      WHERE season_year = 2090
      ORDER BY is_home, is_favorite $$,
  $$ VALUES (false, false, 5, 1, 3, 1),
            (false, true, 1, 1, 0, 0),
            (true, false, 1, 0, 1, 0),
            (true, true, 5, 3, 1, 1) $$,
  '62. quadrants: league-wide home/away x fav/dog, incl. a road favorite and a home underdog'
);

-- ── Divisional (season 2090) ───────────────────────────────────────────────────────
SELECT results_eq(
  $$ SELECT is_divisional, games, favorite_covers, underdog_covers, pushes
       FROM public.league_ats_divisional
      WHERE season_year = 2090
      ORDER BY is_divisional $$,
  $$ VALUES (false, 3, 2, 1, 0),
            (true, 3, 2, 0, 1) $$,
  '63. divisional: same-conference-and-division matchups split from the rest'
);

-- ── Primetime (season 2091) ────────────────────────────────────────────────────────
SELECT results_eq(
  $$ SELECT slot, games, favorite_covers
       FROM public.league_ats_primetime
      WHERE season_year = 2091
      ORDER BY slot COLLATE "C" $$,
  $$ VALUES ('MNF', 1, 1),
            ('SNF', 2, 2),
            ('TNF', 1, 1),
            ('day', 1, 1) $$,
  '64. primetime: TNF/SNF/MNF/day slots; SNF = 2 folds in the January (EST) game'
);

SELECT is(
  (SELECT CASE
     WHEN extract(dow from et) = 0 AND extract(hour from et) >= 18 THEN 'SNF'
     ELSE 'other'
   END
     FROM (
       SELECT '2092-01-07 01:20:00+00'::timestamptz AT TIME ZONE 'America/New_York' AS et
     ) x),
  'SNF',
  '65. DST-safe: a Jan 01:20Z kickoff resolves to Sunday-night ET, not the next UTC day'
);

-- ── Streaks (season 2092) ──────────────────────────────────────────────────────────
SELECT results_eq(
  $$ SELECT t.external_key, s.streak_result, s.streak_length,
            s.last4_wins, s.last4_losses, s.last4_pushes
       FROM public.league_ats_streaks s
       JOIN public.teams t ON t.id = s.team_id
      WHERE s.season_year = 2092 AND t.external_key IN ('STRK_A', 'STRK_B')
      ORDER BY t.external_key $$,
  $$ VALUES ('STRK_A', 'push', 0, 2, 1, 1),
            ('STRK_B', 'win', 3, 3, 0, 1) $$,
  '66. streaks: a most-recent push resets to 0; an earlier push caps a 3-game cover run'
);

-- ── Seed: division/conference for the 32 NFL teams ─────────────────────────────────
-- Insert the 32 NFL external_keys (skipping any already present), run the canonical seed
-- UPDATE, and confirm every NFL team lands on the expected division + conference while a
-- non-NFL team stays null.
-- name is UNIQUE (uq_teams_name), so seed each with a distinct sentinel name.
INSERT INTO public.teams (league, external_key, name, short_name) VALUES
  ('NFL', 'BUF', 'seed BUF', 'BUF'), ('NFL', 'MIA', 'seed MIA', 'MIA'),
  ('NFL', 'NE', 'seed NE', 'NE'), ('NFL', 'NYJ', 'seed NYJ', 'NYJ'),
  ('NFL', 'BAL', 'seed BAL', 'BAL'), ('NFL', 'CIN', 'seed CIN', 'CIN'),
  ('NFL', 'CLE', 'seed CLE', 'CLE'), ('NFL', 'PIT', 'seed PIT', 'PIT'),
  ('NFL', 'HOU', 'seed HOU', 'HOU'), ('NFL', 'IND', 'seed IND', 'IND'),
  ('NFL', 'JAX', 'seed JAX', 'JAX'), ('NFL', 'TEN', 'seed TEN', 'TEN'),
  ('NFL', 'DEN', 'seed DEN', 'DEN'), ('NFL', 'KC', 'seed KC', 'KC'),
  ('NFL', 'LV', 'seed LV', 'LV'), ('NFL', 'LAC', 'seed LAC', 'LAC'),
  ('NFL', 'DAL', 'seed DAL', 'DAL'), ('NFL', 'NYG', 'seed NYG', 'NYG'),
  ('NFL', 'PHI', 'seed PHI', 'PHI'), ('NFL', 'WAS', 'seed WAS', 'WAS'),
  ('NFL', 'CHI', 'seed CHI', 'CHI'), ('NFL', 'DET', 'seed DET', 'DET'),
  ('NFL', 'GB', 'seed GB', 'GB'), ('NFL', 'MIN', 'seed MIN', 'MIN'),
  ('NFL', 'ATL', 'seed ATL', 'ATL'), ('NFL', 'CAR', 'seed CAR', 'CAR'),
  ('NFL', 'NO', 'seed NO', 'NO'), ('NFL', 'TB', 'seed TB', 'TB'),
  ('NFL', 'ARI', 'seed ARI', 'ARI'), ('NFL', 'LAR', 'seed LAR', 'LAR'),
  ('NFL', 'SF', 'seed SF', 'SF'), ('NFL', 'SEA', 'seed SEA', 'SEA'),
  ('XFL', 'SEEDT_XFL', 'seed XFL', 'XFL')
ON CONFLICT (external_key) DO NOTHING;

UPDATE public.teams t
SET division = v.division, conference = v.conference
FROM (VALUES
  ('BUF', 'East', 'AFC'), ('MIA', 'East', 'AFC'), ('NE', 'East', 'AFC'), ('NYJ', 'East', 'AFC'),
  ('BAL', 'North', 'AFC'), ('CIN', 'North', 'AFC'), ('CLE', 'North', 'AFC'), ('PIT', 'North', 'AFC'),
  ('HOU', 'South', 'AFC'), ('IND', 'South', 'AFC'), ('JAX', 'South', 'AFC'), ('TEN', 'South', 'AFC'),
  ('DEN', 'West', 'AFC'), ('KC', 'West', 'AFC'), ('LV', 'West', 'AFC'), ('LAC', 'West', 'AFC'),
  ('DAL', 'East', 'NFC'), ('NYG', 'East', 'NFC'), ('PHI', 'East', 'NFC'), ('WAS', 'East', 'NFC'),
  ('CHI', 'North', 'NFC'), ('DET', 'North', 'NFC'), ('GB', 'North', 'NFC'), ('MIN', 'North', 'NFC'),
  ('ATL', 'South', 'NFC'), ('CAR', 'South', 'NFC'), ('NO', 'South', 'NFC'), ('TB', 'South', 'NFC'),
  ('ARI', 'West', 'NFC'), ('LAR', 'West', 'NFC'), ('SF', 'West', 'NFC'), ('SEA', 'West', 'NFC')
) AS v(external_key, division, conference)
WHERE t.external_key = v.external_key AND t.league = 'NFL';

SELECT is(
  (SELECT count(*)::int
     FROM public.teams t
     JOIN (VALUES
       ('BUF', 'East', 'AFC'), ('MIA', 'East', 'AFC'), ('NE', 'East', 'AFC'), ('NYJ', 'East', 'AFC'),
       ('BAL', 'North', 'AFC'), ('CIN', 'North', 'AFC'), ('CLE', 'North', 'AFC'), ('PIT', 'North', 'AFC'),
       ('HOU', 'South', 'AFC'), ('IND', 'South', 'AFC'), ('JAX', 'South', 'AFC'), ('TEN', 'South', 'AFC'),
       ('DEN', 'West', 'AFC'), ('KC', 'West', 'AFC'), ('LV', 'West', 'AFC'), ('LAC', 'West', 'AFC'),
       ('DAL', 'East', 'NFC'), ('NYG', 'East', 'NFC'), ('PHI', 'East', 'NFC'), ('WAS', 'East', 'NFC'),
       ('CHI', 'North', 'NFC'), ('DET', 'North', 'NFC'), ('GB', 'North', 'NFC'), ('MIN', 'North', 'NFC'),
       ('ATL', 'South', 'NFC'), ('CAR', 'South', 'NFC'), ('NO', 'South', 'NFC'), ('TB', 'South', 'NFC'),
       ('ARI', 'West', 'NFC'), ('LAR', 'West', 'NFC'), ('SF', 'West', 'NFC'), ('SEA', 'West', 'NFC')
     ) AS e(external_key, division, conference)
       ON e.external_key = t.external_key
      AND t.league = 'NFL'
      AND t.division = e.division
      AND t.conference = e.conference),
  32,
  '67. seed: all 32 NFL teams map to the expected division + conference'
);

SELECT is(
  (SELECT division FROM public.teams WHERE external_key = 'SEEDT_XFL'),
  NULL,
  '68. seed: a non-NFL team keeps a null division'
);

SELECT * FROM finish();
ROLLBACK;
