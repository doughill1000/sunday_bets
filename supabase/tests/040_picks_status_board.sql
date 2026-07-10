-- 039_picks_status_board.sql
-- pgTAP boundary proofs for the ADR-0019 counts-only status board
-- (public.picks_status_board). Proves the group-scoped, COUNTS-ONLY carve-out:
-- co-members' picked counts are visible pre-kickoff, while the sealed-envelope
-- guarantee for pick CONTENT (base-table picks RLS) stays structurally UNCHANGED.
--
-- Proves (ADR-0019 Decision point 6 + issue #388 acceptance criteria):
--   (1) a co-member sees another member's picked count pre-kickoff via the RPC
--       (N/M correct) -- the whole point of the board;
--   (2) the caller sees their own count;
--   (3) the roster is exactly the ACTIVE members (a 'pending' member is excluded);
--   (4/5) the is_complete flag reflects picks_made >= games_available;
--   (6) games_available is the week's game count (matches the picks page denominator);
--   (7) base-table picks RLS is untouched -- the co-member still cannot read those
--       pick rows directly pre-kickoff (no side/team/weight leaks);
--   (8) a non-member of a group sees zero rows for it; per-group scoping holds for a
--       multi-group caller;
--   (9) the exposed shape has NO pick-level column (weight/side/game/team) at all.

BEGIN;

SELECT plan(18);

-- Seed users: A + B are active members of group 1; D is a PENDING member of group 1;
-- C is the sole member of group 2.
SELECT tests.create_supabase_user('board_player_a');
SELECT tests.create_supabase_user('board_player_b');
SELECT tests.create_supabase_user('board_player_c');
SELECT tests.create_supabase_user('board_player_d');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('board_player_a'), 'player', 'Board Player A'),
  (tests.get_supabase_uid('board_player_b'), 'player', 'Board Player B'),
  (tests.get_supabase_uid('board_player_c'), 'player', 'Board Player C'),
  (tests.get_supabase_uid('board_player_d'), 'player', 'Board Player D')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Groups: group 1 = A (active) + B (active) + D (pending); group 2 = C (active).
INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4000-8000-000000000a88', 'Board Group 1'),
  ('00000000-0000-4000-8000-000000000b88', 'Board Group 2');

INSERT INTO public.group_memberships (group_id, user_id, role, status)
VALUES
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_a'), 'member', 'active'),
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_b'), 'member', 'active'),
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_d'), 'member', 'pending'),
  ('00000000-0000-4000-8000-000000000b88', tests.get_supabase_uid('board_player_c'), 'member', 'active');

-- Season, week, THREE FUTURE (pre-kickoff) games plus ONE already-STARTED game.
-- games_available counts only still-open games => 3, not the week's total of 4:
-- the started game (and any pick on it) drops out (remaining-only, #478).
INSERT INTO public.seasons (year) VALUES (2039) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1),
  1,
  now() - interval '1 day',
  now() + interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Eight distinct teams so the four matchups don't collide on uq_games_matchup.
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('BD_T1', 'Board Team 1', 'BD1'),
  ('BD_T2', 'Board Team 2', 'BD2'),
  ('BD_T3', 'Board Team 3', 'BD3'),
  ('BD_T4', 'Board Team 4', 'BD4'),
  ('BD_T5', 'Board Team 5', 'BD5'),
  ('BD_T6', 'Board Team 6', 'BD6'),
  ('BD_T7', 'Board Team 7', 'BD7'),
  ('BD_T8', 'Board Team 8', 'BD8')
ON CONFLICT (external_key) DO NOTHING;

INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES
  ((SELECT id FROM public.weeks WHERE week_number = 1
      AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1)),
   'bd_future_game_1', now() + interval '2 days',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T1'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T2')),
  ((SELECT id FROM public.weeks WHERE week_number = 1
      AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1)),
   'bd_future_game_2', now() + interval '2 days',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T3'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T4')),
  ((SELECT id FROM public.weeks WHERE week_number = 1
      AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1)),
   'bd_future_game_3', now() + interval '2 days',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T5'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T6')),
  ((SELECT id FROM public.weeks WHERE week_number = 1
      AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1)),
   'bd_started_game', now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T7'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T8'))
ON CONFLICT (external_game_id) DO NOTHING;

-- Player A locks 2 of 3 (group 1) => A shows 2/3, not complete.
INSERT INTO public.picks (group_id, user_id, game_id, picked_team_id, weight,
                          locked_at, locked_spread_team_id, locked_spread_value, locked_by)
VALUES
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_a'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_future_game_1'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T1'), 'M',
   now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T1'), -3.5,
   tests.get_supabase_uid('board_player_a')),
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_a'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_future_game_2'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T3'), 'M',
   now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T3'), -3.5,
   tests.get_supabase_uid('board_player_a')),
  -- ...and a pick on the already-STARTED game. This must NOT count toward A's
  -- remaining total: A stays 2/3, not 3/3 (remaining-only, #478).
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_a'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_started_game'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T7'), 'M',
   now() - interval '2 hours',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T7'), -3.5,
   tests.get_supabase_uid('board_player_a'));

-- Player B locks all 3 of 3 (group 1) => B shows 3/3, complete.
INSERT INTO public.picks (group_id, user_id, game_id, picked_team_id, weight,
                          locked_at, locked_spread_team_id, locked_spread_value, locked_by)
VALUES
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_b'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_future_game_1'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T1'), 'M',
   now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T1'), -3.5,
   tests.get_supabase_uid('board_player_b')),
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_b'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_future_game_2'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T3'), 'M',
   now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T3'), -3.5,
   tests.get_supabase_uid('board_player_b')),
  ('00000000-0000-4000-8000-000000000a88', tests.get_supabase_uid('board_player_b'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_future_game_3'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T5'), 'M',
   now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T5'), -3.5,
   tests.get_supabase_uid('board_player_b'));

-- Player C locks 1 of 3 in group 2 => C shows 1/3.
INSERT INTO public.picks (group_id, user_id, game_id, picked_team_id, weight,
                          locked_at, locked_spread_team_id, locked_spread_value, locked_by)
VALUES
  ('00000000-0000-4000-8000-000000000b88', tests.get_supabase_uid('board_player_c'),
   (SELECT id FROM public.games WHERE external_game_id = 'bd_future_game_1'),
   (SELECT id FROM public.teams WHERE external_key = 'BD_T2'), 'M',
   now() - interval '1 hour',
   (SELECT id FROM public.teams WHERE external_key = 'BD_T2'), 3.5,
   tests.get_supabase_uid('board_player_c'));

-- === Tests as Player A (active member of group 1) ===
SELECT tests.authenticate_as('board_player_a');

-- (1) A sees B's picked count pre-kickoff: 3 of 3. This is the carve-out working --
--     under base-table RLS A could not see B's pick rows at all pre-kickoff.
SELECT results_eq(
  $$ SELECT picks_made, games_available FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('board_player_b') $$,
  $$ VALUES (3::integer, 3::integer) $$,
  'RPC: co-member sees another member''s locked count (3/3) pre-kickoff'
);

-- (2) A sees their own count: 2 of 3.
SELECT results_eq(
  $$ SELECT picks_made, games_available FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('board_player_a') $$,
  $$ VALUES (2::integer, 3::integer) $$,
  'RPC: caller sees their own locked count (2/3)'
);

-- (3) The roster is exactly the two ACTIVE members (A + B); pending D is excluded.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int) $$,
  $$ VALUES (2::bigint) $$,
  'RPC: roster is exactly the active members (pending member excluded)'
);

-- (4) The pending member D never appears on the board.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('board_player_d') $$,
  $$ VALUES (0::bigint) $$,
  'RPC: a pending (non-active) member is not on the board'
);

-- (5) is_complete: B (3/3) is complete.
SELECT results_eq(
  $$ SELECT is_complete FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('board_player_b') $$,
  $$ VALUES (true) $$,
  'RPC: is_complete is true for a member who locked every game'
);

-- (6) is_complete: A (2/3) is not complete.
SELECT results_eq(
  $$ SELECT is_complete FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('board_player_a') $$,
  $$ VALUES (false) $$,
  'RPC: is_complete is false for a member with games left to pick'
);

-- (7) games_available counts only STILL-OPEN games (3), not the week's 4 total: the
--     already-started game is excluded from the denominator for every row.
SELECT results_eq(
  $$ SELECT DISTINCT games_available FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int) $$,
  $$ VALUES (3::integer) $$,
  'RPC: games_available counts only still-open games (started game excluded)'
);

-- (7b) The week has 4 games but only 3 are still open — the denominator is the
--      remaining slate, not the full week.
SELECT results_eq(
  $$ SELECT
       (SELECT count(*)::integer FROM public.games
          WHERE week_id = (SELECT id FROM public.weeks WHERE week_number = 1
             AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))),
       (SELECT DISTINCT games_available FROM public.picks_status_board(
          '00000000-0000-4000-8000-000000000a88'::uuid,
          (SELECT id FROM public.weeks WHERE week_number = 1
             AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)) $$,
  $$ VALUES (4::integer, 3::integer) $$,
  'RPC: week has 4 games but games_available is 3 (started game excluded from denominator)'
);

-- (7c) A holds 3 locked picks (2 future + 1 on the started game) but picks_made is 2:
--      the started-game pick is excluded from the numerator, not just the denominator.
SELECT results_eq(
  $$ SELECT
       (SELECT count(*)::integer FROM public.picks
          WHERE group_id = '00000000-0000-4000-8000-000000000a88'
            AND user_id = tests.get_supabase_uid('board_player_a')),
       (SELECT picks_made FROM public.picks_status_board(
          '00000000-0000-4000-8000-000000000a88'::uuid,
          (SELECT id FROM public.weeks WHERE week_number = 1
             AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
        WHERE user_id = tests.get_supabase_uid('board_player_a')) $$,
  $$ VALUES (3::integer, 2::integer) $$,
  'RPC: A has 3 locked picks but picks_made is 2 (started-game pick excluded from numerator)'
);

-- (8) Base-table picks RLS is UNTOUCHED: A still cannot read B's pick rows directly
--     pre-kickoff, so no side/team/weight is leaked -- only the aggregate count is.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks
     WHERE group_id = '00000000-0000-4000-8000-000000000a88'
       AND user_id = tests.get_supabase_uid('board_player_b') $$,
  $$ VALUES (0::bigint) $$,
  'base picks RLS: co-member cannot read another member''s pick rows pre-kickoff'
);

-- (9) Per-group scoping: A is not a member of group 2, so the board is empty for it
--     even though C has picks there.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int) $$,
  $$ VALUES (0::bigint) $$,
  'RPC: a member of group 1 sees an empty board for group 2'
);

-- === Tests as Player C (active member of group 2 only) ===
SELECT tests.authenticate_as('board_player_c');

-- (10) Non-member of group 1 sees an empty board for group 1.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000a88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int) $$,
  $$ VALUES (0::bigint) $$,
  'RPC: a non-member of group 1 sees an empty board'
);

-- (11) C sees their own group-2 count: 1 of 3.
SELECT results_eq(
  $$ SELECT picks_made, games_available FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('board_player_c') $$,
  $$ VALUES (1::integer, 3::integer) $$,
  'RPC: caller sees their own group-2 count (1/3)'
);

-- (12) Group 2 roster is exactly C.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2039 LIMIT 1))::int) $$,
  $$ VALUES (1::bigint) $$,
  'RPC: group 2 roster is exactly its one active member'
);

-- (13-16) The exposed shape has NO pick-level column: selecting any of them from the
--         board errors with undefined_column (SQLSTATE 42703). This proves counts-only
--         structurally, not by UI omission.
SELECT throws_ok(
  $$ SELECT weight FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid, 1) $$,
  '42703', NULL,
  'shape: no weight column is exposed'
);
SELECT throws_ok(
  $$ SELECT picked_side FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid, 1) $$,
  '42703', NULL,
  'shape: no picked_side column is exposed'
);
SELECT throws_ok(
  $$ SELECT game_id FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid, 1) $$,
  '42703', NULL,
  'shape: no game_id column is exposed'
);
SELECT throws_ok(
  $$ SELECT picked_team_id FROM public.picks_status_board(
         '00000000-0000-4000-8000-000000000b88'::uuid, 1) $$,
  '42703', NULL,
  'shape: no picked_team_id column is exposed'
);

SELECT * FROM finish();
ROLLBACK;
