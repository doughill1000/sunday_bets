-- 038_all_in_declarations.sql
-- pgTAP boundary proofs for the ADR-0023 All-In declaration surface
-- (public.all_in_declarations). Proves the weight='A'-only, group-scoped
-- pre-kickoff reveal while the sealed-envelope guarantee for L/M/H picks and
-- the base-table picks RLS are structurally UNCHANGED.
--
-- Proves (ADR-0023 Decision point 5):
--   (1) a co-member sees another member's LOCKED All-In for a not-yet-started game
--       via the RPC;
--   (2) the RPC returns ONLY weight='A' rows (the co-member's M pick is excluded);
--   (3) base-table RLS is untouched — the co-member still cannot read that All-In
--       (nor the M pick) directly from public.picks pre-kickoff;
--   (5) the is_member() gate is per-group — a member of group 1 sees nothing for
--       group 2;
--   (6) a non-member sees nothing;
--   (7) nothing before lock — an unlocked (deleted) All-In is no longer declared.

BEGIN;

SELECT plan(7);

-- Seed users
SELECT tests.create_supabase_user('allin_player_a');
SELECT tests.create_supabase_user('allin_player_b');
SELECT tests.create_supabase_user('allin_player_c');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('allin_player_a'), 'player', 'AllIn Player A'),
  (tests.get_supabase_uid('allin_player_b'), 'player', 'AllIn Player B'),
  (tests.get_supabase_uid('allin_player_c'), 'player', 'AllIn Player C')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Seed groups: group 1 = A + B; group 2 = C
INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4000-8000-000000000a38', 'AllIn Group 1'),
  ('00000000-0000-4000-8000-000000000b38', 'AllIn Group 2');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000000a38', tests.get_supabase_uid('allin_player_a'), 'member'),
  ('00000000-0000-4000-8000-000000000a38', tests.get_supabase_uid('allin_player_b'), 'member'),
  ('00000000-0000-4000-8000-000000000b38', tests.get_supabase_uid('allin_player_c'), 'member');

-- Seed season, week, teams, and two FUTURE (pre-kickoff) games
INSERT INTO public.seasons (year) VALUES (2038) ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1),
  1,
  now() - interval '1 day',
  now() + interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Four distinct teams so the two matchups don't collide on uq_games_matchup.
INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('AI_T1', 'AllIn Team 1', 'AI1'),
  ('AI_T2', 'AllIn Team 2', 'AI2'),
  ('AI_T3', 'AllIn Team 3', 'AI3'),
  ('AI_T4', 'AllIn Team 4', 'AI4')
ON CONFLICT (external_key) DO NOTHING;

-- Future game 1 (kickoff has NOT passed) — T1 (home) vs T2
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT id FROM public.weeks WHERE week_number = 1
     AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1)),
  'ai_future_game_1',
  now() + interval '2 days',
  (SELECT id FROM public.teams WHERE external_key = 'AI_T1'),
  (SELECT id FROM public.teams WHERE external_key = 'AI_T2')
)
ON CONFLICT (external_game_id) DO NOTHING;

-- Future game 2 (kickoff has NOT passed) — T3 (home) vs T4
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT id FROM public.weeks WHERE week_number = 1
     AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1)),
  'ai_future_game_2',
  now() + interval '2 days',
  (SELECT id FROM public.teams WHERE external_key = 'AI_T3'),
  (SELECT id FROM public.teams WHERE external_key = 'AI_T4')
)
ON CONFLICT (external_game_id) DO NOTHING;

-- Player B's LOCKED All-In (weight='A') on future game 1, group 1 (T1 home) —
-- the declaration under test.
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
VALUES (
  '00000000-0000-4000-8000-000000000a38',
  tests.get_supabase_uid('allin_player_b'),
  (SELECT id FROM public.games WHERE external_game_id = 'ai_future_game_1'),
  (SELECT id FROM public.teams WHERE external_key = 'AI_T1'),
  'A',
  now() - interval '1 hour',
  (SELECT id FROM public.teams WHERE external_key = 'AI_T1'),
  -3.5,
  tests.get_supabase_uid('allin_player_b')
);

-- Player B's LOCKED non-All-In (weight='M') on future game 2, group 1 (T3 home) —
-- must stay sealed pre-kickoff and must never surface via the declarations RPC.
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
VALUES (
  '00000000-0000-4000-8000-000000000a38',
  tests.get_supabase_uid('allin_player_b'),
  (SELECT id FROM public.games WHERE external_game_id = 'ai_future_game_2'),
  (SELECT id FROM public.teams WHERE external_key = 'AI_T3'),
  'M',
  now() - interval '1 hour',
  (SELECT id FROM public.teams WHERE external_key = 'AI_T3'),
  -3.5,
  tests.get_supabase_uid('allin_player_b')
);

-- Player C's LOCKED All-In in group 2 on future game 1 (T2 away) — used to prove
-- the RPC's is_member() gate is per-group (A must not see it via group 2).
INSERT INTO public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
VALUES (
  '00000000-0000-4000-8000-000000000b38',
  tests.get_supabase_uid('allin_player_c'),
  (SELECT id FROM public.games WHERE external_game_id = 'ai_future_game_1'),
  (SELECT id FROM public.teams WHERE external_key = 'AI_T2'),
  'A',
  now() - interval '1 hour',
  (SELECT id FROM public.teams WHERE external_key = 'AI_T2'),
  3.5,
  tests.get_supabase_uid('allin_player_c')
);

-- === Tests as Player A (member of group 1) ===
SELECT tests.authenticate_as('allin_player_a');

-- (1) A sees B's locked All-In on the pre-kickoff game via the RPC
SELECT results_eq(
  $$ SELECT count(*) FROM public.all_in_declarations(
         '00000000-0000-4000-8000-000000000a38'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('allin_player_b') $$,
  $$ VALUES (1::bigint) $$,
  'RPC: co-member sees another member''s locked All-In pre-kickoff'
);

-- (2) The RPC returns ONLY weight='A' rows — B's M pick is excluded, so group 1's
--     entire declaration board is exactly the one All-In.
SELECT results_eq(
  $$ SELECT count(*) FROM public.all_in_declarations(
         '00000000-0000-4000-8000-000000000a38'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1))::int) $$,
  $$ VALUES (1::bigint) $$,
  'RPC: returns only weight=A rows (M pick excluded from the board)'
);

-- (3) Base-table RLS untouched: A still cannot read B's All-In directly from picks
--     pre-kickoff — the reveal lives ONLY on the confined surface.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks
     WHERE group_id = '00000000-0000-4000-8000-000000000a38'
       AND user_id = tests.get_supabase_uid('allin_player_b')
       AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'ai_future_game_1') $$,
  $$ VALUES (0::bigint) $$,
  'base picks RLS: co-member cannot read the All-In directly pre-kickoff'
);

-- (4) Base-table RLS untouched for L/M/H: A cannot read B's M pick directly either.
SELECT results_eq(
  $$ SELECT count(*) FROM public.picks
     WHERE group_id = '00000000-0000-4000-8000-000000000a38'
       AND user_id = tests.get_supabase_uid('allin_player_b')
       AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'ai_future_game_2') $$,
  $$ VALUES (0::bigint) $$,
  'base picks RLS: co-member cannot read a non-All-In pick pre-kickoff'
);

-- (5) is_member() gate is per-group: A is not a member of group 2, so the RPC
--     returns nothing for group 2 even though C locked an All-In there.
SELECT results_eq(
  $$ SELECT count(*) FROM public.all_in_declarations(
         '00000000-0000-4000-8000-000000000b38'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1))::int) $$,
  $$ VALUES (0::bigint) $$,
  'RPC: a member of group 1 sees no declarations for group 2'
);

-- === Test as Player C (member of group 2 only) ===
SELECT tests.authenticate_as('allin_player_c');

-- (6) Non-member of group 1 sees nothing for group 1.
SELECT results_eq(
  $$ SELECT count(*) FROM public.all_in_declarations(
         '00000000-0000-4000-8000-000000000a38'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1))::int) $$,
  $$ VALUES (0::bigint) $$,
  'RPC: a non-member of group 1 sees no declarations'
);

-- (7) Nothing before lock: unlocking an All-In deletes the row (see unlock_pick),
--     after which it is no longer declared. Simulate the unlock as the superuser
--     (RESET ROLE bypasses RLS), then re-check as co-member A.
RESET ROLE;
DELETE FROM public.picks
WHERE group_id = '00000000-0000-4000-8000-000000000a38'
  AND user_id = tests.get_supabase_uid('allin_player_b')
  AND game_id = (SELECT id FROM public.games WHERE external_game_id = 'ai_future_game_1');

SELECT tests.authenticate_as('allin_player_a');
SELECT results_eq(
  $$ SELECT count(*) FROM public.all_in_declarations(
         '00000000-0000-4000-8000-000000000a38'::uuid,
         (SELECT id FROM public.weeks WHERE week_number = 1
            AND season_id = (SELECT id FROM public.seasons WHERE year = 2038 LIMIT 1))::int)
     WHERE user_id = tests.get_supabase_uid('allin_player_b') $$,
  $$ VALUES (0::bigint) $$,
  'RPC: an unlocked (deleted) All-In is no longer declared'
);

SELECT * FROM finish();
ROLLBACK;
