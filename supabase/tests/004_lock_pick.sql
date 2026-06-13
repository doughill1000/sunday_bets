-- 004_lock_pick.sql
-- pgTAP tests for public.lock_pick() using Basejump Supabase test helpers.
--
-- lock_pick is SECURITY INVOKER, so it runs with the caller's role + auth.uid()
-- and is subject to RLS. We seed fixtures as the (superuser) test runner, then
-- exercise the function as an authenticated player via tests.authenticate_as.

BEGIN;

SELECT plan(10);

-- 1) Function exists with the expected signature
SELECT has_function(
  'public', 'lock_pick',
  ARRAY['uuid','public.side_enum','public.weight_enum','text'],
  'public.lock_pick(uuid, side_enum, weight_enum, text) exists'
);

-- ---- Fixtures (run as superuser; RLS bypassed) -----------------------------
SELECT tests.create_supabase_user('picker');

INSERT INTO public.users (id, role, display_name)
VALUES (tests.get_supabase_uid('picker'), 'player', 'Picker')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Season + TWO weeks so week 1 is not the final week (All-In rule only applies
-- when the pick's week is not the last week of the season).
INSERT INTO public.seasons (year) VALUES (2025)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES
  ((SELECT id FROM public.seasons WHERE year = 2025 LIMIT 1), 1, now(),                     now() + interval '7 days'),
  ((SELECT id FROM public.seasons WHERE year = 2025 LIMIT 1), 2, now() + interval '7 days', now() + interval '14 days')
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.teams (external_key, name, short_name)
VALUES ('LP_A','Lock Team A','LA'), ('LP_B','Lock Team B','LB')
ON CONFLICT (external_key) DO NOTHING;

-- Four games, all in week 1: future (lockable), a second future (All-In rule),
-- a past one (after kickoff), and one with no active line.
WITH wk AS (
  SELECT id AS week_id FROM public.weeks
  WHERE week_number = 1
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2025 LIMIT 1)
), t AS (
  SELECT (SELECT id FROM public.teams WHERE external_key = 'LP_A') AS home_id,
         (SELECT id FROM public.teams WHERE external_key = 'LP_B') AS away_id
)
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT wk.week_id, 'lp_future',  now() + interval '1 day', t.home_id, t.away_id FROM wk, t
UNION ALL
SELECT wk.week_id, 'lp_future2', now() + interval '1 day', t.home_id, t.away_id FROM wk, t
UNION ALL
SELECT wk.week_id, 'lp_past',    now() - interval '1 day', t.home_id, t.away_id FROM wk, t
UNION ALL
SELECT wk.week_id, 'lp_noline',  now() + interval '1 day', t.home_id, t.away_id FROM wk, t
ON CONFLICT (external_game_id) DO NOTHING;

-- Active line (on the home team, -6.5) for every game except lp_noline.
INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
SELECT g.id, 'fanduel',
       (SELECT id FROM public.teams WHERE external_key = 'LP_A'), -6.5, true, now()
FROM public.games g
WHERE g.external_game_id IN ('lp_future','lp_future2','lp_past');

-- ---- Authenticated player exercises lock_pick ------------------------------
SELECT tests.authenticate_as('picker');

-- 2) Happy path: returns ok=true echoing the picked side and weight
SELECT results_eq(
  $$ SELECT ok, picked_side, weight
       FROM public.lock_pick(
         (SELECT id FROM public.games WHERE external_game_id = 'lp_future'),
         'home'::public.side_enum, 'M'::public.weight_enum) $$,
  $$ VALUES (true, 'home'::public.side_enum, 'M'::public.weight_enum) $$,
  'lock_pick locks a future game and echoes (ok, side, weight)'
);

-- 3) The active line is snapshotted onto the pick row
SELECT results_eq(
  $$ SELECT weight, locked_spread_value
       FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'lp_future')
        AND user_id = tests.get_supabase_uid('picker') $$,
  $$ VALUES ('M'::public.weight_enum, (-6.5)::numeric) $$,
  'lock_pick snapshots the active line spread onto the pick'
);

-- 4) Re-locking the same game overwrites side/weight (upsert)
SELECT results_eq(
  $$ SELECT ok, picked_side, weight
       FROM public.lock_pick(
         (SELECT id FROM public.games WHERE external_game_id = 'lp_future'),
         'away'::public.side_enum, 'H'::public.weight_enum) $$,
  $$ VALUES (true, 'away'::public.side_enum, 'H'::public.weight_enum) $$,
  'lock_pick overwrites an existing pick on re-lock'
);

-- 5) ...and does not create a duplicate row
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'lp_future')
        AND user_id = tests.get_supabase_uid('picker') $$,
  $$ VALUES (1) $$,
  're-locking leaves exactly one pick row (upsert, not insert)'
);

-- 6) Locking after kickoff is rejected
SELECT throws_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_past'),
       'home'::public.side_enum, 'H'::public.weight_enum) $$,
  'P0001', 'edits are not allowed after kickoff',
  'lock_pick rejects a game that has already kicked off'
);

-- 7) Locking a game with no active line is rejected
SELECT throws_like(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_noline'),
       'home'::public.side_enum, 'M'::public.weight_enum) $$,
  'no active line for game%',
  'lock_pick rejects a game with no active line'
);

-- 8) First All-In of the week succeeds (re-locks lp_future to weight A)
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_future'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'first All-In of the week is allowed'
);

-- 9) Second All-In in the same week is rejected
SELECT throws_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_future2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'P0001', 'all in already used this week',
  'lock_pick rejects a second All-In in the same week'
);

-- 10) Anonymous callers cannot lock a pick: the function's auth.uid() guard
--     rejects them. (Note: anon can technically reach the function body because
--     Postgres leaves the default EXECUTE grant to PUBLIC in place, so the
--     revoke-from-anon in anon_grants.sql is not what stops them here -- the
--     unauthorized guard is. Hence we assert P0001/unauthorized, not 42501.)
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT public.lock_pick(
       '00000000-0000-0000-0000-000000000000'::uuid,
       'home'::public.side_enum, 'M'::public.weight_enum) $$,
  'P0001', 'unauthorized',
  'anon (no auth.uid) is rejected as unauthorized'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
