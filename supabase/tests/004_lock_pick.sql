-- 004_lock_pick.sql
-- pgTAP tests for public.lock_pick() using Basejump Supabase test helpers.
--
-- lock_pick is SECURITY INVOKER, so it runs with the caller's role + auth.uid()
-- and is subject to RLS. We seed fixtures as the (superuser) test runner, then
-- exercise the function as an authenticated player via tests.authenticate_as.

BEGIN;

SELECT plan(15);

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

INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4000-8000-000000000004', 'Lock Pick Group')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES ('00000000-0000-4000-8000-000000000004', tests.get_supabase_uid('picker'), 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Season + THREE weeks:
--   Week 1 = non-final (All-In restricted)
--   Week 2 = non-final (used for final-week-disabled tests)
--   Week 3 = final week of the season
-- Year 2088 is a sentinel with no real NFL data; using a real year risks
-- ON CONFLICT DO NOTHING reusing an existing season that has more than 3
-- weeks, which would cause max(week_number) > 3 and break the final-week
-- detection in lock_pick.
INSERT INTO public.seasons (year) VALUES (2088)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES
  ((SELECT id FROM public.seasons WHERE year = 2088 LIMIT 1), 1, now(),                     now() + interval '7 days'),
  ((SELECT id FROM public.seasons WHERE year = 2088 LIMIT 1), 2, now() + interval '7 days', now() + interval '14 days'),
  ((SELECT id FROM public.seasons WHERE year = 2088 LIMIT 1), 3, now() + interval '14 days', now() + interval '21 days')
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Teams for the various games.
INSERT INTO public.teams (external_key, name, short_name)
VALUES ('LP_A','Lock Team A','LA'), ('LP_B','Lock Team B','LB'),
       ('LP_C','Lock Team C','LC'), ('LP_D','Lock Team D','LD'),
       ('LP_E','Lock Team E','LE'), ('LP_F','Lock Team F','LF')
ON CONFLICT (external_key) DO NOTHING;

-- Games in week 1 (non-final): future, second future, past, no-line.
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT wk.week_id, g.external_game_id, g.commence_time, home.id, away.id
FROM (
  SELECT id AS week_id FROM public.weeks
  WHERE week_number = 1
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2088 LIMIT 1)
) wk
CROSS JOIN (
  VALUES
    ('lp_future',  now() + interval '1 day', 'LP_A', 'LP_B'),
    ('lp_future2', now() + interval '1 day', 'LP_C', 'LP_D'),
    ('lp_past',    now() - interval '1 day', 'LP_B', 'LP_C'),
    ('lp_noline',  now() + interval '1 day', 'LP_A', 'LP_D')
) g(external_game_id, commence_time, home_key, away_key)
JOIN public.teams home ON home.external_key = g.home_key
JOIN public.teams away ON away.external_key = g.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- Games in week 3 (final week): two future games for All-In limit tests.
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT wk.week_id, g.external_game_id, g.commence_time, home.id, away.id
FROM (
  SELECT id AS week_id FROM public.weeks
  WHERE week_number = 3
    AND season_id = (SELECT id FROM public.seasons WHERE year = 2088 LIMIT 1)
) wk
CROSS JOIN (
  VALUES
    ('lp_final_1', now() + interval '15 days', 'LP_A', 'LP_C'),
    ('lp_final_2', now() + interval '15 days', 'LP_B', 'LP_D')
) g(external_game_id, commence_time, home_key, away_key)
JOIN public.teams home ON home.external_key = g.home_key
JOIN public.teams away ON away.external_key = g.away_key
ON CONFLICT (external_game_id) DO NOTHING;

-- Active line for all games except lp_noline.
INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
SELECT g.id, 'fanduel', g.home_team_id, -6.5, true, now()
FROM public.games g
WHERE g.external_game_id IN ('lp_future','lp_future2','lp_past','lp_final_1','lp_final_2');

-- Ensure settings row exists with default (final_week_unlimited_allin = true).
INSERT INTO public.settings (id, final_week_unlimited_allin)
VALUES (true, true)
ON CONFLICT (id) DO UPDATE SET final_week_unlimited_allin = true;

-- SECURITY DEFINER helper so mid-test settings mutations work even after
-- tests.clear_authentication() resets the session role to anon.
CREATE OR REPLACE FUNCTION tests.set_final_week_allin(val boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.settings SET final_week_unlimited_allin = val WHERE id = true;
$$;

-- SECURITY DEFINER helper to clear final-week picks between scenarios. A plain
-- DELETE after clear_authentication() runs as anon and is blocked by RLS, so it
-- would silently affect 0 rows and leave stale All-In picks behind.
CREATE OR REPLACE FUNCTION tests.delete_final_week_picks()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.picks
  WHERE game_id IN (
    SELECT id FROM public.games WHERE external_game_id IN ('lp_final_1','lp_final_2')
  );
$$;

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

-- 9) Second All-In in the same (non-final) week is rejected
SELECT throws_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_future2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'P0001', 'all in already used this week',
  'lock_pick rejects a second All-In in a non-final week'
);

-- 10) Anonymous callers cannot lock a pick
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT public.lock_pick(
       '00000000-0000-0000-0000-000000000000'::uuid,
       'home'::public.side_enum, 'M'::public.weight_enum) $$,
  '42501', NULL,
  'anon cannot execute lock_pick -- no PUBLIC grant (closed-by-default baseline)'
);
RESET ROLE;

-- ---- Final-week exception tests (setting = true = default) -----------------
SELECT tests.authenticate_as('picker');

-- 11) First All-In in the final week is allowed
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_final_1'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'first All-In in the final week is allowed (exception enabled)'
);

-- 12) Second All-In in the final week is also allowed when exception is enabled
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_final_2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'second All-In in the final week is allowed when final_week_unlimited_allin = true'
);

-- ---- Final-week exception tests (setting = false) --------------------------
-- Switch the setting off via SECURITY DEFINER helper (session role is anon after clear_authentication).
SELECT tests.clear_authentication();
SELECT tests.set_final_week_allin(false);

-- Clean up the final-week All-In picks so the test below starts from a clean state.
SELECT tests.delete_final_week_picks();

SELECT tests.authenticate_as('picker');

-- 13) First All-In in the final week is allowed regardless
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_final_1'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'first All-In in the final week is still allowed when exception is disabled'
);

-- 14) Second All-In in the final week is rejected when exception is disabled
SELECT throws_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_final_2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'P0001', 'all in already used this week',
  'lock_pick rejects a second All-In in the final week when final_week_unlimited_allin = false'
);

-- 15) Restoring the setting to true re-enables the exception
SELECT tests.clear_authentication();
SELECT tests.set_final_week_allin(true);

SELECT tests.delete_final_week_picks();

SELECT tests.authenticate_as('picker');

SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'lp_final_2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'second All-In in final week is allowed again after re-enabling the exception'
);

SELECT * FROM finish();
ROLLBACK;
