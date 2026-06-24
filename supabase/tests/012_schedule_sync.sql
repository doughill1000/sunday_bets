-- 012_schedule_sync.sql
-- pgTAP tests for:
--   upsert_game_by_matchup()  — schedule sync writer
--   attach_line_to_matchup()  — odds sync attacher
--   uq_games_matchup          — matchup uniqueness constraint
--   games.schedule_game_id    — new column

BEGIN;

SELECT plan(17);

-- ---- Schema assertions -------------------------------------------------------

SELECT has_function(
  'public', 'upsert_game_by_matchup',
  ARRAY['int','int','int','timestamptz','text','text'],
  'upsert_game_by_matchup(int,int,int,timestamptz,text,text) exists'
);

SELECT has_function(
  'public', 'attach_line_to_matchup',
  ARRAY['int','int','int','text'],
  'attach_line_to_matchup(int,int,int,text) exists'
);

SELECT has_column('public', 'games', 'schedule_game_id', 'games.schedule_game_id column exists');

SELECT col_is_null('public', 'games', 'schedule_game_id', 'schedule_game_id is nullable');

SELECT has_index(
  'public', 'games', 'uq_games_matchup',
  'games has uq_games_matchup unique expression index'
);

-- ---- Fixtures ----------------------------------------------------------------

INSERT INTO public.seasons (league, year)
VALUES ('NFL', 2099)
ON CONFLICT ON CONSTRAINT uq_seasons_league_year DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
SELECT id, 1,
       '2099-09-04 00:00:00+00',
       '2099-09-09 00:00:00+00'
FROM   public.seasons WHERE year = 2099
ON CONFLICT ON CONSTRAINT ux_weeks_season_week DO NOTHING;

-- Seed two teams for the fixture matchup (the test DB has no league seed).
INSERT INTO public.teams (external_key, name, short_name)
VALUES ('SCHED_H', 'Schedule Home', 'SCH'),
       ('SCHED_A', 'Schedule Away', 'SCA')
ON CONFLICT (external_key) DO NOTHING;

SELECT id INTO TEMP tmp_home
FROM public.teams WHERE external_key = 'SCHED_H' LIMIT 1;

SELECT id INTO TEMP tmp_away
FROM public.teams WHERE external_key = 'SCHED_A' LIMIT 1;

WITH w AS (
  SELECT id FROM public.weeks WHERE week_number = 1
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2099)
)
SELECT id INTO TEMP tmp_week FROM w;

-- pgTAP assertion functions must run as top-level SELECTs so their TAP output
-- reaches the harness; calling them via PERFORM inside a DO block discards the
-- result (the assertion would never be reported, pass or fail). The matchup row
-- is unique, so it is addressed below by its (week, home, away) key rather than
-- a captured uuid where possible.

-- ---- upsert_game_by_matchup: creates a new game row ---------------------------

SELECT public.upsert_game_by_matchup(
  (SELECT id FROM tmp_week), (SELECT id FROM tmp_home), (SELECT id FROM tmp_away),
  '2099-09-07 20:00:00+00'::timestamptz, 'ESPN_001', 'scheduled'
) AS id INTO TEMP tmp_created;

SELECT ok((SELECT id FROM tmp_created) IS NOT NULL, 'upsert_game_by_matchup returns a uuid');

SELECT is(
  (SELECT count(*)::int FROM public.games
     WHERE id = (SELECT id FROM tmp_created) AND schedule_game_id = 'ESPN_001'),
  1,
  'schedule_game_id stored on new game'
);

-- ---- upsert_game_by_matchup: in-place flex update (same game_id) -------------

SELECT public.upsert_game_by_matchup(
  (SELECT id FROM tmp_week), (SELECT id FROM tmp_home), (SELECT id FROM tmp_away),
  '2099-09-08 00:20:00+00'::timestamptz, 'ESPN_001', 'scheduled'
) AS id INTO TEMP tmp_flex;

SELECT is(
  (SELECT id FROM tmp_flex), (SELECT id FROM tmp_created),
  'flex update keeps the same game uuid'
);

SELECT is(
  (SELECT count(*)::int FROM public.games
     WHERE id = (SELECT id FROM tmp_flex)
       AND commence_time = '2099-09-08 00:20:00+00'::timestamptz),
  1,
  'flex update changes commence_time in place'
);

SELECT is(
  (SELECT count(*)::int FROM public.picks WHERE game_id = (SELECT id FROM tmp_flex)),
  0,
  'no picks orphaned by flex update'
);

-- ---- upsert_game_by_matchup: does not overwrite terminal status ---------------

UPDATE public.games SET status = 'final'
WHERE id = (SELECT id FROM tmp_created);

SELECT public.upsert_game_by_matchup(
  (SELECT id FROM tmp_week), (SELECT id FROM tmp_home), (SELECT id FROM tmp_away),
  '2099-09-07 20:00:00+00'::timestamptz, 'ESPN_001', 'scheduled'
);

SELECT is(
  (SELECT status FROM public.games WHERE id = (SELECT id FROM tmp_created)),
  'final',
  'upsert_game_by_matchup does not overwrite terminal status'
);

-- ---- attach_line_to_matchup: canonical home/away match ----------------------

UPDATE public.games SET external_game_id = NULL
WHERE id = (SELECT id FROM tmp_created);

SELECT public.attach_line_to_matchup(
  (SELECT id FROM tmp_week), (SELECT id FROM tmp_home), (SELECT id FROM tmp_away), 'ODDS_001'
) AS id INTO TEMP tmp_attach;

SELECT ok(
  (SELECT id FROM tmp_attach) IS NOT NULL,
  'attach_line_to_matchup finds game by canonical home/away'
);

SELECT is(
  (SELECT count(*)::int FROM public.games
     WHERE id = (SELECT id FROM tmp_attach) AND external_game_id = 'ODDS_001'),
  1,
  'attach_line_to_matchup sets external_game_id'
);

-- ---- attach_line_to_matchup: swapped home/away still finds the game ----------

UPDATE public.games SET external_game_id = NULL
WHERE id = (SELECT id FROM tmp_created);

-- Pass teams in swapped order (simulating a provider home/away disagreement)
SELECT ok(
  public.attach_line_to_matchup(
    (SELECT id FROM tmp_week), (SELECT id FROM tmp_away), (SELECT id FROM tmp_home), 'ODDS_002'
  ) IS NOT NULL,
  'attach_line_to_matchup finds game with swapped home/away'
);

-- ---- attach_line_to_matchup: returns NULL for unknown matchup ----------------

SELECT ok(
  public.attach_line_to_matchup((SELECT id FROM tmp_week), -1, -2, 'ODDS_999') IS NULL,
  'attach_line_to_matchup returns NULL for unknown matchup'
);

-- ---- attach_line_to_matchup: does not overwrite existing external_game_id ----

UPDATE public.games SET external_game_id = 'ODDS_EXISTING'
WHERE id = (SELECT id FROM tmp_created);

SELECT public.attach_line_to_matchup(
  (SELECT id FROM tmp_week), (SELECT id FROM tmp_home), (SELECT id FROM tmp_away), 'ODDS_NEW'
);

SELECT is(
  (SELECT external_game_id FROM public.games WHERE id = (SELECT id FROM tmp_created)),
  'ODDS_EXISTING',
  'attach_line_to_matchup does not overwrite existing external_game_id'
);

-- ---- uq_games_matchup prevents duplicates ------------------------------------

SELECT throws_ok(
  format(
    $q$ INSERT INTO public.games
          (week_id, home_team_id, away_team_id, commence_time, status)
        VALUES (%s, %s, %s, '2099-09-07 20:00:00+00', 'scheduled') $q$,
    (SELECT id FROM tmp_week), (SELECT id FROM tmp_home), (SELECT id FROM tmp_away)
  ),
  '23505',
  NULL,
  'uq_games_matchup blocks duplicate matchup insert'
);

SELECT * FROM finish();
ROLLBACK;
