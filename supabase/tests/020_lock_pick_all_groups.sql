-- 020_lock_pick_all_groups.sql
-- pgTAP tests for public.lock_pick_all_groups() / public.unlock_pick_all_groups().
--
-- Both functions are SECURITY INVOKER; tests run as an authenticated player via
-- tests.authenticate_as, mirroring the pattern in 004_lock_pick.sql.
--
-- NOTE: ux_active_line_per_game allows only ONE is_active_line=true row per game,
-- so all three test groups use the same source (fanduel).  Partial-apply is
-- exercised via All-In exhaustion rather than per-source line absence.

BEGIN;

SELECT plan(19);

-- 1) Functions exist with expected signatures
SELECT has_function(
  'public', 'lock_pick_all_groups',
  ARRAY['uuid','public.side_enum','public.weight_enum'],
  'public.lock_pick_all_groups(uuid, side_enum, weight_enum) exists'
);

SELECT has_function(
  'public', 'unlock_pick_all_groups',
  ARRAY['uuid'],
  'public.unlock_pick_all_groups(uuid) exists'
);

-- ---- Fixtures (run as superuser; RLS bypassed) --------------------------------

SELECT tests.create_supabase_user('mg_picker');
SELECT tests.create_supabase_user('sg_picker');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('mg_picker'), 'player', 'MGPicker'),
  (tests.get_supabase_uid('sg_picker'), 'player', 'SGPicker')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Three active groups for mg_picker — all use fanduel so the single active
-- line per game is reachable by every group.
INSERT INTO public.groups (id, name) VALUES
  ('00000000-0000-4000-8000-000000002001', 'FanOut Group A'),
  ('00000000-0000-4000-8000-000000002002', 'FanOut Group B'),
  ('00000000-0000-4000-8000-000000002003', 'FanOut Group C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_config (group_id, line_source) VALUES
  ('00000000-0000-4000-8000-000000002001', 'fanduel'),
  ('00000000-0000-4000-8000-000000002002', 'fanduel'),
  ('00000000-0000-4000-8000-000000002003', 'fanduel')
ON CONFLICT (group_id) DO UPDATE SET line_source = EXCLUDED.line_source;

-- Pending group: mg_picker is pending here — must NOT receive a pick row
INSERT INTO public.groups (id, name) VALUES
  ('00000000-0000-4000-8000-000000002004', 'FanOut Group D Pending')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.group_config (group_id, line_source) VALUES
  ('00000000-0000-4000-8000-000000002004', 'fanduel')
ON CONFLICT (group_id) DO UPDATE SET line_source = EXCLUDED.line_source;

INSERT INTO public.group_memberships (group_id, user_id, role, status) VALUES
  ('00000000-0000-4000-8000-000000002001', tests.get_supabase_uid('mg_picker'), 'member', 'active'),
  ('00000000-0000-4000-8000-000000002002', tests.get_supabase_uid('mg_picker'), 'member', 'active'),
  ('00000000-0000-4000-8000-000000002003', tests.get_supabase_uid('mg_picker'), 'member', 'active'),
  ('00000000-0000-4000-8000-000000002004', tests.get_supabase_uid('mg_picker'), 'member', 'pending'),
  ('00000000-0000-4000-8000-000000002001', tests.get_supabase_uid('sg_picker'),  'member', 'active')
ON CONFLICT (group_id, user_id) DO UPDATE SET status = EXCLUDED.status;

-- Season 2087: two weeks so week 1 is non-final (All-In restricted)
INSERT INTO public.seasons (year) VALUES (2087)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES
  ((SELECT id FROM public.seasons WHERE year = 2087 LIMIT 1), 1,
   now(),                     now() + interval '7 days'),
  ((SELECT id FROM public.seasons WHERE year = 2087 LIMIT 1), 2,
   now() + interval '7 days', now() + interval '14 days')
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('FA_A','FanOut Team A','FAA'), ('FA_B','FanOut Team B','FAB'),
  ('FA_C','FanOut Team C','FAC'), ('FA_D','FanOut Team D','FAD'),
  ('FA_E','FanOut Team E','FAE'), ('FA_F','FanOut Team F','FAF')
ON CONFLICT (external_key) DO NOTHING;

-- game1: future, week 1 — fanduel line (all 3 groups succeed)
-- game2: future, week 1 — NO fanduel line (all 3 groups skip)
-- game3: future, week 1 — fanduel line (for first All-In)
-- game4: future, week 1 — fanduel line (for second All-In attempt → all fail)
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT wk.id, g.eid, g.ct, home.id, away.id
FROM (SELECT id FROM public.weeks
      WHERE week_number = 1
        AND season_id = (SELECT id FROM public.seasons WHERE year = 2087 LIMIT 1)) wk
CROSS JOIN (VALUES
  ('fa_g1', now() + interval '1 day', 'FA_A', 'FA_B'),
  ('fa_g2', now() + interval '1 day', 'FA_C', 'FA_D'),
  ('fa_g3', now() + interval '1 day', 'FA_E', 'FA_F'),
  ('fa_g4', now() + interval '1 day', 'FA_A', 'FA_C')
) g(eid, ct, hk, ak)
JOIN public.teams home ON home.external_key = g.hk
JOIN public.teams away ON away.external_key = g.ak
ON CONFLICT (external_game_id) DO NOTHING;

-- One active line per game (ux_active_line_per_game allows only one is_active_line=true
-- row per game_id).  game2 intentionally has no fanduel line so all groups skip.
INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
SELECT g.id, l.source, home.id, l.spread, true, now()
FROM (VALUES
  ('fa_g1', 'fanduel', 'FA_A', -6.5),
  ('fa_g3', 'fanduel', 'FA_E', -4.5),
  ('fa_g4', 'fanduel', 'FA_A', -2.5)
) l(eid, source, hk, spread)
JOIN public.games g ON g.external_game_id = l.eid
JOIN public.teams home ON home.external_key = l.hk;

-- final_week_unlimited_allin = false so All-In per-week enforcement is active
INSERT INTO public.settings (id, final_week_unlimited_allin)
VALUES (true, false)
ON CONFLICT (id) DO UPDATE SET final_week_unlimited_allin = false;

-- SECURITY DEFINER helpers for mid-test cleanup (session may be anon after clear_authentication)
CREATE OR REPLACE FUNCTION tests.delete_fanout_picks(p_game_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.picks WHERE user_id = tests.get_supabase_uid('mg_picker')
    AND game_id = p_game_id;
$$;

-- ---- Authenticated player exercises lock_pick_all_groups ----------------------
SELECT tests.authenticate_as('mg_picker');

-- 3) Happy path: 3 active groups all return ok=true for game1
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g1'),
         'home'::public.side_enum, 'M'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (3) $$,
  'fan-out applies to all 3 active groups (game1)'
);

-- 4) Three pick rows exist after the fan-out
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g1')
        AND user_id = tests.get_supabase_uid('mg_picker') $$,
  $$ VALUES (3) $$,
  'three pick rows written — one per active group'
);

-- 5) Pending group D received no pick row
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g1')
        AND user_id = tests.get_supabase_uid('mg_picker')
        AND group_id = '00000000-0000-4000-8000-000000002004' $$,
  $$ VALUES (0) $$,
  'pending membership (group D) receives no pick row'
);

-- 6) Group A snapshotted fanduel spread (-6.5)
SELECT results_eq(
  $$ SELECT locked_spread_value FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g1')
        AND user_id = tests.get_supabase_uid('mg_picker')
        AND group_id = '00000000-0000-4000-8000-000000002001' $$,
  $$ VALUES ((-6.5)::numeric) $$,
  'group A snapshots fanduel spread -6.5'
);

-- 7) game2 has no fanduel line → all 3 groups skip (0 ok)
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g2'),
         'home'::public.side_enum, 'H'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (0) $$,
  'game2: no fanduel line — all 3 groups skip (0 ok)'
);

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g2')
        AND user_id = tests.get_supabase_uid('mg_picker') $$,
  $$ VALUES (0) $$,
  'game2: 0 pick rows written (no active fanduel line)'
);

-- 8) Re-lock on game1 with different side is idempotent (upsert, no extra rows)
SELECT lives_ok(
  $$ SELECT public.lock_pick_all_groups(
       (SELECT id FROM public.games WHERE external_game_id = 'fa_g1'),
       'away'::public.side_enum, 'H'::public.weight_enum) $$,
  're-locking game1 with a different side is accepted'
);

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g1')
        AND user_id = tests.get_supabase_uid('mg_picker') $$,
  $$ VALUES (3) $$,
  're-lock leaves exactly 3 rows (no duplicate rows)'
);

-- 9) First All-In for the week succeeds across all groups
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g3'),
         'home'::public.side_enum, 'A'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (3) $$,
  'first All-In of the week applies to all 3 groups'
);

-- 10) Second All-In on a different game → all 3 groups skip (All-In already used)
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g4'),
         'home'::public.side_enum, 'A'::public.weight_enum)
      WHERE ok = false $$,
  $$ VALUES (3) $$,
  'second All-In attempt: all three groups skipped (All-In already used this week)'
);

-- 11) Unauthorized lock is rejected
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT public.lock_pick_all_groups(
       '00000000-0000-0000-0000-000000000000'::uuid,
       'home'::public.side_enum, 'M'::public.weight_enum) $$,
  'P0001', 'unauthorized',
  'anon call to lock_pick_all_groups is rejected'
);
RESET ROLE;

-- ---- unlock_pick_all_groups --------------------------------------------------
SELECT tests.authenticate_as('mg_picker');

-- 12) Unlock removes picks from all active groups (game1 has picks in 3 groups)
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.unlock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g1'))
      WHERE ok = true $$,
  $$ VALUES (3) $$,
  'unlock_pick_all_groups returns ok for all 3 active groups'
);

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g1')
        AND user_id = tests.get_supabase_uid('mg_picker') $$,
  $$ VALUES (0) $$,
  'all group picks for game1 deleted after unlock'
);

-- 13) Unlock when no pick exists is idempotent (ok=true, not an error)
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.unlock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g1'))
      WHERE ok = true $$,
  $$ VALUES (3) $$,
  'unlock_pick_all_groups is idempotent when no pick exists'
);

-- 14) Unauthorized unlock is rejected
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT public.unlock_pick_all_groups(
       '00000000-0000-0000-0000-000000000000'::uuid) $$,
  'P0001', 'unauthorized',
  'anon call to unlock_pick_all_groups is rejected'
);
RESET ROLE;

-- 15) Single-group player fans out to exactly 1 group
SELECT tests.authenticate_as('sg_picker');

SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fa_g1'),
         'home'::public.side_enum, 'M'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (1) $$,
  'single-group player gets exactly 1 ok result from fan-out'
);

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.picks
      WHERE game_id = (SELECT id FROM public.games WHERE external_game_id = 'fa_g1')
        AND user_id = tests.get_supabase_uid('sg_picker') $$,
  $$ VALUES (1) $$,
  'single-group player has exactly 1 pick row'
);

SELECT * FROM finish();
ROLLBACK;
