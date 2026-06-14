-- 003_grade_pick.sql
-- pgTAP tests for public.grade_pick()
--
-- grade_pick is an IMMUTABLE pure SQL function (no auth / no RLS), so we can
-- call it directly with literal inputs and assert the (points_delta, outcome)
-- it returns. Convention used below: home_id = 1, away_id = 2.
--
-- Margin model (see ats_margin_at_lock): margin = (home_pts - away_pts)
--   - abs(spread_value)  when the line is stored on the home team
--   + abs(spread_value)  when the line is stored on the away team
-- margin > 0 => home covered, margin < 0 => away covered, margin = 0 => push.
-- weight_points: L=1, M=3, H=5, A=10.

BEGIN;

SELECT plan(10);

-- 1) Function exists with the expected signature
SELECT has_function(
  'public', 'grade_pick',
  ARRAY['integer','integer','integer','integer','integer','integer','numeric','text'],
  'public.grade_pick(...) exists'
);

-- 2) Home favored by 3, wins by 4 (covers); pick HOME, weight L => +1 win
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(24, 20, 1, 2, 1, 1, -3, 'L') $$,
  $$ VALUES (1, 'win'::public.pick_outcome) $$,
  'home covers (margin +1), pick home, L => (+1, win)'
);

-- 3) Same favorite line, wins by only 1 (does NOT cover); pick HOME, weight M => -3 loss
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(21, 20, 1, 2, 1, 1, -3, 'M') $$,
  $$ VALUES (-3, 'loss'::public.pick_outcome) $$,
  'home fails to cover (margin -2), pick home, M => (-3, loss)'
);

-- 4) Same scenario, pick AWAY, weight H => +5 win (away covered)
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(21, 20, 1, 2, 2, 1, -3, 'H') $$,
  $$ VALUES (5, 'win'::public.pick_outcome) $$,
  'away covers (margin -2), pick away, H => (+5, win)'
);

-- 5) Exact push (favored by 3, wins by exactly 3); pick HOME, weight A => 0 push
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(23, 20, 1, 2, 1, 1, -3, 'A') $$,
  $$ VALUES (0, 'push'::public.pick_outcome) $$,
  'exact push (margin 0), pick home, A => (0, push)'
);

-- 6) Push is side-independent; pick AWAY also => 0 push
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(23, 20, 1, 2, 2, 1, -3, 'A') $$,
  $$ VALUES (0, 'push'::public.pick_outcome) $$,
  'exact push (margin 0), pick away, A => (0, push)'
);

-- 7) Line stored on the AWAY team: margin = raw + abs(spread). home wins by 4,
--    away spread 3 => margin +7 (home covers); pick HOME, weight L => +1 win
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(24, 20, 1, 2, 1, 2, 3, 'L') $$,
  $$ VALUES (1, 'win'::public.pick_outcome) $$,
  'away-side line (margin +7), pick home, L => (+1, win)'
);

-- 8) abs(spread_value): positive spread on home grades identically to negative.
--    Favored by 3 (passed as +3), wins by 4 => margin +1, pick HOME, L => +1 win
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(24, 20, 1, 2, 1, 1, 3, 'L') $$,
  $$ VALUES (1, 'win'::public.pick_outcome) $$,
  'spread_value sign ignored (abs): +3 home line grades same => (+1, win)'
);

-- 9) All-In weight applies full 10 points on a win
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(30, 10, 1, 2, 1, 1, -3, 'A') $$,
  $$ VALUES (10, 'win'::public.pick_outcome) $$,
  'home covers big, pick home, A => (+10, win)'
);

-- 10) All-In weight applies full -10 points on a loss (pick wrong side of a cover)
SELECT results_eq(
  $$ SELECT points_delta, outcome FROM public.grade_pick(30, 10, 1, 2, 2, 1, -3, 'A') $$,
  $$ VALUES (-10, 'loss'::public.pick_outcome) $$,
  'home covers big, pick away, A => (-10, loss)'
);

SELECT * FROM finish();
ROLLBACK;
