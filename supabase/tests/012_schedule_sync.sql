-- 012_schedule_sync.sql
-- pgTAP tests for:
--   upsert_game_by_matchup()  — schedule sync writer
--   attach_line_to_matchup()  — odds sync attacher
--   uq_games_matchup          — matchup uniqueness constraint
--   games.schedule_game_id    — new column

BEGIN;

SELECT plan(20);

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

SELECT col_is_nullable('public', 'games', 'schedule_game_id', 'schedule_game_id is nullable');

SELECT has_unique(
  'public', 'games', 'uq_games_matchup',
  'games has uq_games_matchup unique constraint'
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

-- Use two real teams for the fixture matchup
WITH t AS (
  SELECT id FROM public.teams WHERE external_key = 'PHI' LIMIT 1
)
SELECT id INTO TEMP tmp_home FROM t;

WITH t AS (
  SELECT id FROM public.teams WHERE external_key = 'KC' LIMIT 1
)
SELECT id INTO TEMP tmp_away FROM t;

WITH w AS (
  SELECT id FROM public.weeks WHERE week_number = 1
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2099)
)
SELECT id INTO TEMP tmp_week FROM w;

-- ---- upsert_game_by_matchup: creates a new game row ---------------------------

DO $$
DECLARE
  v_game_id uuid;
  v_home    int := (SELECT id FROM tmp_home);
  v_away    int := (SELECT id FROM tmp_away);
  v_week    int := (SELECT id FROM tmp_week);
BEGIN
  v_game_id := public.upsert_game_by_matchup(
    v_week, v_home, v_away,
    '2099-09-07 20:00:00+00'::timestamptz,
    'ESPN_001', 'scheduled'
  );

  PERFORM ok(v_game_id IS NOT NULL, 'upsert_game_by_matchup returns a uuid');

  PERFORM results_eq(
    format($q$ SELECT count(*)::int FROM public.games
              WHERE id = %L AND schedule_game_id = 'ESPN_001' $q$, v_game_id),
    $q$ VALUES (1) $q$,
    'schedule_game_id stored on new game'
  );
END $$;

-- ---- upsert_game_by_matchup: in-place flex update (same game_id) -------------

DO $$
DECLARE
  v_id_before uuid;
  v_id_after  uuid;
  v_home      int := (SELECT id FROM tmp_home);
  v_away      int := (SELECT id FROM tmp_away);
  v_week      int := (SELECT id FROM tmp_week);
  v_new_time  timestamptz := '2099-09-08 00:20:00+00';
BEGIN
  SELECT id INTO v_id_before FROM public.games
  WHERE week_id = v_week AND home_team_id = v_home AND away_team_id = v_away;

  v_id_after := public.upsert_game_by_matchup(
    v_week, v_home, v_away,
    v_new_time,
    'ESPN_001', 'scheduled'
  );

  PERFORM ok(v_id_before = v_id_after, 'flex update keeps the same game uuid');

  PERFORM results_eq(
    format($q$ SELECT count(*)::int FROM public.games
              WHERE id = %L AND commence_time = %L $q$, v_id_after, v_new_time),
    $q$ VALUES (1) $q$,
    'flex update changes commence_time in place'
  );

  PERFORM results_eq(
    format($q$ SELECT count(*)::int FROM public.picks WHERE game_id = %L $q$, v_id_after),
    $q$ VALUES (0) $q$,
    'no picks orphaned by flex update'
  );
END $$;

-- ---- upsert_game_by_matchup: does not overwrite terminal status ---------------

DO $$
DECLARE
  v_home int := (SELECT id FROM tmp_home);
  v_away int := (SELECT id FROM tmp_away);
  v_week int := (SELECT id FROM tmp_week);
BEGIN
  -- Force the row to 'final'
  UPDATE public.games SET status = 'final'
  WHERE week_id = v_week AND home_team_id = v_home AND away_team_id = v_away;

  PERFORM public.upsert_game_by_matchup(
    v_week, v_home, v_away,
    '2099-09-07 20:00:00+00'::timestamptz,
    'ESPN_001', 'scheduled'
  );

  PERFORM results_eq(
    $q$ SELECT count(*)::int FROM public.games WHERE status = 'final' $q$,
    $q$ VALUES (1) $q$,
    'upsert_game_by_matchup does not overwrite terminal status'
  );
END $$;

-- ---- attach_line_to_matchup: canonical home/away match ----------------------

DO $$
DECLARE
  v_home   int  := (SELECT id FROM tmp_home);
  v_away   int  := (SELECT id FROM tmp_away);
  v_week   int  := (SELECT id FROM tmp_week);
  v_result uuid;
BEGIN
  -- Clear any external_game_id so attach can set it
  UPDATE public.games SET external_game_id = NULL
  WHERE week_id = v_week AND home_team_id = v_home AND away_team_id = v_away;

  v_result := public.attach_line_to_matchup(v_week, v_home, v_away, 'ODDS_001');

  PERFORM ok(v_result IS NOT NULL, 'attach_line_to_matchup finds game by canonical home/away');

  PERFORM results_eq(
    format($q$ SELECT count(*)::int FROM public.games
              WHERE id = %L AND external_game_id = 'ODDS_001' $q$, v_result),
    $q$ VALUES (1) $q$,
    'attach_line_to_matchup sets external_game_id'
  );
END $$;

-- ---- attach_line_to_matchup: swapped home/away still finds the game ----------

DO $$
DECLARE
  v_home   int  := (SELECT id FROM tmp_home);
  v_away   int  := (SELECT id FROM tmp_away);
  v_week   int  := (SELECT id FROM tmp_week);
  v_result uuid;
BEGIN
  -- Clear external_game_id before second attach attempt
  UPDATE public.games SET external_game_id = NULL
  WHERE week_id = v_week AND home_team_id = v_home AND away_team_id = v_away;

  -- Pass teams in swapped order (simulating a provider home/away disagreement)
  v_result := public.attach_line_to_matchup(v_week, v_away, v_home, 'ODDS_002');

  PERFORM ok(v_result IS NOT NULL, 'attach_line_to_matchup finds game with swapped home/away');
END $$;

-- ---- attach_line_to_matchup: returns NULL for unknown matchup ----------------

DO $$
DECLARE
  v_week   int  := (SELECT id FROM tmp_week);
  v_result uuid;
BEGIN
  -- Use team ids that have no game in this week
  SELECT public.attach_line_to_matchup(v_week, -1, -2, 'ODDS_999') INTO v_result;

  PERFORM ok(v_result IS NULL, 'attach_line_to_matchup returns NULL for unknown matchup');
END $$;

-- ---- attach_line_to_matchup: does not overwrite existing external_game_id ----

DO $$
DECLARE
  v_home   int  := (SELECT id FROM tmp_home);
  v_away   int  := (SELECT id FROM tmp_away);
  v_week   int  := (SELECT id FROM tmp_week);
  v_result uuid;
BEGIN
  -- Seed a known external_game_id
  UPDATE public.games SET external_game_id = 'ODDS_EXISTING'
  WHERE week_id = v_week AND home_team_id = v_home AND away_team_id = v_away;

  v_result := public.attach_line_to_matchup(v_week, v_home, v_away, 'ODDS_NEW');

  PERFORM results_eq(
    format($q$ SELECT count(*)::int FROM public.games
              WHERE id = %L AND external_game_id = 'ODDS_EXISTING' $q$, v_result),
    $q$ VALUES (1) $q$,
    'attach_line_to_matchup does not overwrite existing external_game_id'
  );
END $$;

-- ---- uq_games_matchup prevents duplicates ------------------------------------

DO $$
DECLARE
  v_home int := (SELECT id FROM tmp_home);
  v_away int := (SELECT id FROM tmp_away);
  v_week int := (SELECT id FROM tmp_week);
BEGIN
  PERFORM throws_ok(
    format(
      $q$ INSERT INTO public.games
            (week_id, home_team_id, away_team_id, commence_time, status)
          VALUES (%s, %s, %s, '2099-09-07 20:00:00+00', 'scheduled') $q$,
      v_week, v_home, v_away
    ),
    '23505',
    NULL,
    'uq_games_matchup blocks duplicate matchup insert'
  );
END $$;

SELECT * FROM finish();
ROLLBACK;
