-- 048_league_situational_baseline.sql
-- pgTAP tests for public.league_situational_baseline (issue #502, PR 2): the league-wide market
-- ATS cover baseline per situational cut, at the backed-side grain, that the "Your edge" panel
-- subtracts from a player's own per-cut cover rate.
--
-- This view is CAREER-grain (all seasons pooled, no season_year), so -- unlike league_ats_* -- a
-- test cannot isolate its own fixture by season, and a seeded local DB would contaminate any
-- absolute-count assertion (the "count-assertion tests fail local-only on a seeded DB" gotcha).
-- So the correctness checks here are the side-grain INVARIANTS, which hold for ANY data:
--   * symmetric cuts (primetime / spread / divisional) count both perspective rows of each game,
--     so within every such bucket one side covers and the other does not -> wins = losses always;
--   * the home/away split counts only its own side, so the home bucket mirrors the away bucket
--     (home.wins = away.losses, home.losses = away.wins, equal pushes);
--   * every league_ats_base row is bucketed exactly once per dimension, so each dimension's total
--     decisions reconciles to the base row count (divisional excludes unclassifiable matchups).
-- The bucket CLASSIFICATION itself (primetime slot via ET, spread magnitude, divisional) is the
-- exact same SQL as stats_situational_base and is hand-checked per game in 047; league_ats_base's
-- team-relative spread_value / commence_time / opponent_team_id are hand-checked in 042. A small
-- self-contained fixture (season 2094) guarantees non-empty rows across every path even on an
-- unseeded CI database. Owns NFL season year 2094; runs in its own BEGIN/ROLLBACK.

BEGIN;

SELECT plan(16);

-- ── 1: Structure ────────────────────────────────────────────────────────────────
SELECT has_view('public', 'league_situational_baseline',
  '1. league_situational_baseline is a plain view');

-- ── 2-4: Grants (service_role only; matview-derived, no RLS -- ADR-0013) ──────────
SELECT ok(has_table_privilege('service_role', 'public.league_situational_baseline', 'select'),
  '2. service_role can SELECT league_situational_baseline');
SELECT ok(NOT has_table_privilege('anon', 'public.league_situational_baseline', 'select'),
  '3. anon cannot SELECT league_situational_baseline');
SELECT ok(NOT has_table_privilege('authenticated', 'public.league_situational_baseline', 'select'),
  '4. authenticated cannot SELECT league_situational_baseline');

-- ── Fixture: season 2094, scoring week 1. Teams carry divisions so is_divisional can be
--    classified; LSB_H3 is deliberately unclassified (NULL) to exercise the divisional
--    exclusion. commence_time picks the primetime slot; the line sets the spread bucket. ──────
INSERT INTO public.seasons (league, year) VALUES ('NFL', 2094)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts, is_scoring)
VALUES
  ((SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094),
    1, '2094-09-10 00:00:00+00', '2094-09-17 00:00:00+00', true)
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.teams (external_key, name, short_name, division, conference) VALUES
  ('LSB_H1', 'LSB Home 1', 'LB1', 'East', 'AFC'), ('LSB_A1', 'LSB Away 1', 'LC1', 'East', 'AFC'),
  ('LSB_H2', 'LSB Home 2', 'LB2', 'West', 'AFC'), ('LSB_A2', 'LSB Away 2', 'LC2', 'East', 'NFC'),
  ('LSB_H3', 'LSB Home 3', 'LB3', NULL, NULL),    ('LSB_A3', 'LSB Away 3', 'LC3', 'North', 'NFC'),
  ('LSB_H4', 'LSB Home 4', 'LB4', 'South', 'AFC'), ('LSB_A4', 'LSB Away 4', 'LC4', 'South', 'AFC'),
  ('LSB_H5', 'LSB Home 5', 'LB5', 'East', 'NFC'), ('LSB_A5', 'LSB Away 5', 'LC5', 'West', 'NFC')
ON CONFLICT (external_key) DO UPDATE
  SET division = EXCLUDED.division, conference = EXCLUDED.conference;

-- g1 TNF night, divisional, -7 (7-9.5); g2 Sun day, non-div, -3 (1-3); g3 Sun day, unclassified
-- (divisional NULL), -10 (10+); g4 SNF night, divisional, -1 (1-3); g5 Sun day, non-div, pick'em.
INSERT INTO public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores
)
SELECT w.id, gk.ext, gk.ct::timestamptz, home.id, away.id, 'final', gk.fs::jsonb
FROM (VALUES
  ('lsb-g1', '2094-09-11 00:15:00+00', 'LSB_H1', 'LSB_A1', '{"home":28,"away":14}'),  -- Thu 20:15 ET
  ('lsb-g2', '2094-09-13 17:00:00+00', 'LSB_H2', 'LSB_A2', '{"home":20,"away":17}'),  -- Sun 13:00 ET
  ('lsb-g3', '2094-09-13 17:00:00+00', 'LSB_H3', 'LSB_A3', '{"home":31,"away":10}'),  -- Sun 13:00 ET
  ('lsb-g4', '2094-09-14 00:20:00+00', 'LSB_H4', 'LSB_A4', '{"home":21,"away":20}'),  -- Sun 20:20 ET
  ('lsb-g5', '2094-09-13 17:00:00+00', 'LSB_H5', 'LSB_A5', '{"home":24,"away":24}')   -- Sun 13:00 ET
) gk(ext, ct, home_key, away_key, fs)
JOIN public.weeks w
  ON w.week_number = 1
  AND w.season_id = (SELECT id FROM public.seasons WHERE league = 'NFL' AND year = 2094)
JOIN public.teams home ON home.external_key = gk.home_key
JOIN public.teams away ON away.external_key = gk.away_key
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (
  game_id, source, spread_team_id, spread_value, is_active_line, is_closing_line, fetched_at
)
SELECT g.id, 'fanduel', st.id, ln.sv, true, true, '2094-09-10 17:00:00+00'
FROM (VALUES
  ('lsb-g1', 'LSB_H1', -7), ('lsb-g2', 'LSB_H2', -3), ('lsb-g3', 'LSB_H3', -10),
  ('lsb-g4', 'LSB_H4', -1), ('lsb-g5', 'LSB_H5', 0)
) ln(ext, spread_key, sv)
JOIN public.games g ON g.external_game_id = ln.ext
JOIN public.teams st ON st.external_key = ln.spread_key;

-- Repopulate league_ats_base so it reflects the fixture (ADR-0013).
SELECT public.refresh_leaderboard_stats();

-- ── 5: all four dimensions present ────────────────────────────────────────────────
SELECT is(
  (SELECT count(DISTINCT dimension)::int FROM public.league_situational_baseline),
  4,
  '5. all four dimensions (primetime, home_away, spread, divisional) are present');

-- ── 6-8: symmetric-cut invariant -- both perspectives counted, so wins = losses ────
SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline
    WHERE dimension = 'spread' AND wins <> losses),
  0,
  '6. every spread bucket is balanced (side-grain: wins = losses)');
SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline
    WHERE dimension = 'primetime' AND wins <> losses),
  0,
  '7. every primetime bucket is balanced (wins = losses)');
SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline
    WHERE dimension = 'divisional' AND wins <> losses),
  0,
  '8. every divisional bucket is balanced (wins = losses)');

-- ── 9: home/away mirror -- each side counts only its own perspective ──────────────
SELECT results_eq(
  $$ SELECT h.wins - a.losses, h.losses - a.wins, h.pushes - a.pushes
       FROM (SELECT * FROM public.league_situational_baseline
              WHERE dimension = 'home_away' AND bucket = 'home') h,
            (SELECT * FROM public.league_situational_baseline
              WHERE dimension = 'home_away' AND bucket = 'away') a $$,
  $$ VALUES (0, 0, 0) $$,
  '9. home/away mirror: home.wins = away.losses, home.losses = away.wins, equal pushes');

-- ── 10-11: derived columns ─────────────────────────────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline
    WHERE decisions <> wins + losses + pushes),
  0,
  '10. decisions = wins + losses + pushes for every row');
SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline
    WHERE accuracy IS DISTINCT FROM round(wins::numeric / nullif(wins + losses, 0), 4)),
  0,
  '11. accuracy = round(wins / (wins + losses), 4), NULL when no decisions');

-- ── 12-15: per-dimension reconciliation to league_ats_base row count ──────────────
-- Each dimension buckets every base row exactly once (divisional excludes the unclassifiable),
-- so its total decisions equals the base population it covers.
SELECT is(
  (SELECT coalesce(sum(decisions), 0)::int FROM public.league_situational_baseline
    WHERE dimension = 'home_away'),
  (SELECT count(*)::int FROM public.league_ats_base),
  '12. home_away covers every base row exactly once');
SELECT is(
  (SELECT coalesce(sum(decisions), 0)::int FROM public.league_situational_baseline
    WHERE dimension = 'primetime'),
  (SELECT count(*)::int FROM public.league_ats_base),
  '13. primetime covers every base row exactly once');
SELECT is(
  (SELECT coalesce(sum(decisions), 0)::int FROM public.league_situational_baseline
    WHERE dimension = 'spread'),
  (SELECT count(*)::int FROM public.league_ats_base),
  '14. spread covers every base row exactly once');
SELECT is(
  (SELECT coalesce(sum(decisions), 0)::int FROM public.league_situational_baseline
    WHERE dimension = 'divisional'),
  (SELECT count(*)::int FROM public.league_ats_base b
     JOIN public.teams t ON t.id = b.team_id
     JOIN public.teams o ON o.id = b.opponent_team_id
    WHERE t.division IS NOT NULL AND t.conference IS NOT NULL
      AND o.division IS NOT NULL AND o.conference IS NOT NULL),
  '15. divisional covers exactly the classifiable base rows (unclassifiable excluded)');

-- ── 16: every bucket label is valid for its dimension ─────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.league_situational_baseline
    WHERE (dimension = 'home_away' AND bucket NOT IN ('home', 'away'))
       OR (dimension = 'primetime' AND bucket NOT IN ('primetime', 'day'))
       OR (dimension = 'spread' AND bucket NOT IN ('pickem', '1-3', '3.5-6.5', '7-9.5', '10+'))
       OR (dimension = 'divisional' AND bucket NOT IN ('divisional', 'non_divisional'))),
  0,
  '16. every bucket label is valid for its dimension');

SELECT * FROM finish();
ROLLBACK;
