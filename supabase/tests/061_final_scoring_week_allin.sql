-- 061_final_scoring_week_allin.sql
-- pgTAP for #792: the unlimited-All-In exemption belongs to the season's last SCORING
-- week, not to whatever week happens to carry the highest week_number.
--
-- ADR-0016 boundary 2 says whether a round counts is decided exclusively by `is_scoring`,
-- never by the sign of `week_number`, and explicitly provides for a practice round on
-- regular-season games (`is_scoring=false` with a NON-NEGATIVE week_number). Both
-- lock_pick and lock_pick_all_groups resolved the final week with an unfiltered
-- `max(week_number)`, which is correct only by the accident that preseason is numbered
-- negatively -- such a practice round would have taken the exemption off the real finale.
--
-- The fixture is exactly that shape: a season whose highest-numbered week is a non-scoring
-- practice round sitting ABOVE the last scoring week. Both RPCs are asserted (they carried
-- mirrored copies of the predicate and drifted together) plus the shared helper they now
-- both call, so the two call sites cannot diverge again.
--
-- Sentinel years 2086 / 2085 have no real NFL data. Locally these tests run against a
-- prod clone, so the fixture must not depend on data it did not create.

BEGIN;

SELECT plan(17);

-- 1) The shared helper exists
SELECT has_function(
  'public', '_is_final_scoring_week',
  ARRAY['integer'],
  'public._is_final_scoring_week(int) exists'
);

-- ---- Fixtures (run as superuser; RLS bypassed) -----------------------------
SELECT tests.create_supabase_user('fw_picker');

INSERT INTO public.users (id, role, display_name)
VALUES (tests.get_supabase_uid('fw_picker'), 'player', 'FW Picker')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Exactly one group: lock_pick takes the first membership, lock_pick_all_groups fans out
-- to the same single active membership, so both RPCs act on the same (group, user, week).
INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4000-8000-000000000792', 'Final Scoring Week Group')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_memberships (group_id, user_id, role, status)
VALUES ('00000000-0000-4000-8000-000000000792', tests.get_supabase_uid('fw_picker'), 'member', 'active')
ON CONFLICT (group_id, user_id) DO UPDATE SET status = EXCLUDED.status;

-- Season 2086 -- the ADR-0016 boundary-2 shape:
--   week -1 : preseason, non-scoring (today's only non-scoring shape)
--   week  1 : scoring
--   week  2 : scoring  <-- the real finale, the week the exemption belongs to
--   week  3 : NON-scoring practice round, numbered ABOVE the finale
INSERT INTO public.seasons (id, league, year) VALUES (9861, 'NFL', 2086)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) VALUES
  (98601, 9861, -1, now() - interval '21 days', now() - interval '14 days', false),
  (98602, 9861,  1, now() - interval '7 days',  now(),                      true),
  (98603, 9861,  2, now(),                      now() + interval '7 days',  true),
  (98604, 9861,  3, now() + interval '7 days',  now() + interval '14 days', false)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Season 2085 -- a season with NO scoring weeks at all (the state a real season passes
-- through while only preseason rounds have been synced). `max(week_number) WHERE is_scoring`
-- is NULL here, and a null must not silently switch the once-per-week rule off.
INSERT INTO public.seasons (id, league, year) VALUES (9862, 'NFL', 2085)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) VALUES
  (98621, 9862, -1, now(), now() + interval '7 days', false)
ON CONFLICT (season_id, week_number) DO NOTHING;

-- Four teams -> four distinct matchups per week (uq_games_matchup is unique on
-- (week_id, least(home,away), greatest(home,away))).
INSERT INTO public.teams (external_key, name, short_name) VALUES
  ('FW_A','Final Week Team A','FWA'), ('FW_B','Final Week Team B','FWB'),
  ('FW_C','Final Week Team C','FWC'), ('FW_D','Final Week Team D','FWD')
ON CONFLICT (external_key) DO NOTHING;

--   fw_f1/fw_f2 -> lock_pick in the finale        fw_f3/fw_f4 -> lock_pick_all_groups
--   fw_p1/fw_p2 -> lock_pick in the practice round fw_p3/fw_p4 -> lock_pick_all_groups
--   fw_n1/fw_n2 -> the no-scoring-weeks season
INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
SELECT g.week_id, g.eid, g.ct, home.id, away.id
FROM (VALUES
  (98603, 'fw_f1', now() + interval '1 day',  'FW_A', 'FW_B'),
  (98603, 'fw_f2', now() + interval '1 day',  'FW_A', 'FW_C'),
  (98603, 'fw_f3', now() + interval '1 day',  'FW_A', 'FW_D'),
  (98603, 'fw_f4', now() + interval '1 day',  'FW_B', 'FW_C'),
  (98604, 'fw_p1', now() + interval '8 days', 'FW_A', 'FW_B'),
  (98604, 'fw_p2', now() + interval '8 days', 'FW_A', 'FW_C'),
  (98604, 'fw_p3', now() + interval '8 days', 'FW_A', 'FW_D'),
  (98604, 'fw_p4', now() + interval '8 days', 'FW_B', 'FW_C'),
  (98621, 'fw_n1', now() + interval '1 day',  'FW_A', 'FW_B'),
  (98621, 'fw_n2', now() + interval '1 day',  'FW_A', 'FW_C')
) g(week_id, eid, ct, hk, ak)
JOIN public.teams home ON home.external_key = g.hk
JOIN public.teams away ON away.external_key = g.ak
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
SELECT g.id, 'fanduel', g.home_team_id, 3.5, true, now()
FROM public.games g
WHERE g.external_game_id IN
  ('fw_f1','fw_f2','fw_f3','fw_f4','fw_p1','fw_p2','fw_p3','fw_p4','fw_n1','fw_n2');

-- The exemption is switched on; without it every week enforces one All-In and the two
-- directions below would be indistinguishable.
INSERT INTO public.settings (id, final_week_unlimited_allin)
VALUES (true, true)
ON CONFLICT (id) DO UPDATE SET final_week_unlimited_allin = true;

-- SECURITY DEFINER cleanup so the two RPCs each get a clean practice round (a plain DELETE
-- after clear_authentication() runs as anon and is silently blocked by RLS).
CREATE OR REPLACE FUNCTION tests.delete_fw_week_picks(p_week_id int)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.picks
  WHERE game_id IN (SELECT id FROM public.games WHERE week_id = p_week_id);
$$;

-- ---- The helper itself -----------------------------------------------------
-- 2) The last SCORING week is the finale even though week 3 is numbered higher.
SELECT is(
  public._is_final_scoring_week(98603), true,
  'the last scoring week is the finale despite a higher-numbered non-scoring round'
);

-- 3) The non-scoring practice round is never the finale, however it is numbered.
SELECT is(
  public._is_final_scoring_week(98604), false,
  'a non-scoring round numbered above the last scoring week is not the finale'
);

-- 4) An ordinary earlier scoring week is not the finale.
SELECT is(
  public._is_final_scoring_week(98602), false,
  'an earlier scoring week is not the finale'
);

-- 5) Preseason (negative, non-scoring) is not the finale -- today's shape, unchanged.
SELECT is(
  public._is_final_scoring_week(98601), false,
  'a negative-numbered preseason round is not the finale'
);

-- 6) An unknown week is false, not null (a null would make the caller's guard null).
SELECT is(
  public._is_final_scoring_week(-1), false,
  'an unknown week id resolves to false, not null'
);

-- 7) A season with no scoring weeks yet has no finale -- again false, not null.
SELECT is(
  public._is_final_scoring_week(98621), false,
  'a season with no scoring weeks has no finale (false, not null)'
);

-- ---- lock_pick -------------------------------------------------------------
SELECT tests.authenticate_as('fw_picker');

-- 8/9) The exemption still lands on the real finale (week 2), not on week 3.
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'fw_f1'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'lock_pick: first All-In in the last scoring week is allowed'
);

SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'fw_f2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'lock_pick: second All-In in the last scoring week is allowed (exemption not stolen by the practice round)'
);

-- 10/11) ...and the practice round gets the ordinary one-per-round rule.
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'fw_p1'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'lock_pick: first All-In in the non-scoring practice round is allowed'
);

SELECT throws_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'fw_p2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'P0001', 'all in already used this week',
  'lock_pick: second All-In in the non-scoring practice round is rejected'
);

-- ---- lock_pick_all_groups (same rule, second call site) --------------------
SELECT tests.clear_authentication();
SELECT tests.delete_fw_week_picks(98604);
SELECT tests.authenticate_as('fw_picker');

-- 12/13) Finale: both All-Ins fan out successfully.
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fw_f3'),
         'home'::public.side_enum, 'A'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (1) $$,
  'lock_pick_all_groups: first All-In in the last scoring week fans out'
);

SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fw_f4'),
         'home'::public.side_enum, 'A'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (1) $$,
  'lock_pick_all_groups: second All-In in the last scoring week fans out (exemption applies)'
);

-- 14/15) Practice round: the second is skipped per group.
SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fw_p3'),
         'home'::public.side_enum, 'A'::public.weight_enum)
      WHERE ok = true $$,
  $$ VALUES (1) $$,
  'lock_pick_all_groups: first All-In in the non-scoring practice round fans out'
);

SELECT results_eq(
  $$ SELECT count(*)::int
       FROM public.lock_pick_all_groups(
         (SELECT id FROM public.games WHERE external_game_id = 'fw_p4'),
         'home'::public.side_enum, 'A'::public.weight_enum)
      WHERE ok = false AND reason = 'all in already used this week' $$,
  $$ VALUES (1) $$,
  'lock_pick_all_groups: second All-In in the non-scoring practice round is skipped'
);

-- ---- A season with no scoring weeks at all ---------------------------------
-- The unfiltered max() made this round look like the finale; the filtered max() is NULL
-- here, so the guard must fall back to enforcing rather than evaluating to null.
-- 16/17)
SELECT lives_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'fw_n1'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'lock_pick: first All-In in a season with no scoring weeks is allowed'
);

SELECT throws_ok(
  $$ SELECT public.lock_pick(
       (SELECT id FROM public.games WHERE external_game_id = 'fw_n2'),
       'home'::public.side_enum, 'A'::public.weight_enum) $$,
  'P0001', 'all in already used this week',
  'lock_pick: a season with no scoring weeks grants no exemption (null-safe)'
);

SELECT * FROM finish();
ROLLBACK;
