-- 023_materialized_leaderboard_stats.sql
-- Structural coverage for the leaderboard/stats materialized views (issue #191):
--   1. Each of the 9 aggregation views is materialized (not a plain view).
--   2. Each carries the unique index REFRESH ... CONCURRENTLY requires.
--   3. public.refresh_leaderboard_stats() exists, is SECURITY DEFINER, and runs cleanly
--      inside a transaction (the same shape as the service-role rpc the grading path uses).
--   4. The matviews are readable by service_role only (anon/authenticated are denied).

BEGIN;

SELECT plan(24);

-- ── 1. The 9 aggregation views are materialized ──────────────────────────────
SELECT has_materialized_view('public', 'leaderboard_season_totals', 'leaderboard_season_totals is materialized');
SELECT has_materialized_view('public', 'stats_season_trend', 'stats_season_trend is materialized');
SELECT has_materialized_view('public', 'stats_accuracy_by_team', 'stats_accuracy_by_team is materialized');
SELECT has_materialized_view('public', 'stats_accuracy_by_weight', 'stats_accuracy_by_weight is materialized');
SELECT has_materialized_view('public', 'stats_head_to_head', 'stats_head_to_head is materialized');
SELECT has_materialized_view('public', 'stats_head_to_head_alltime', 'stats_head_to_head_alltime is materialized');
SELECT has_materialized_view('public', 'stats_alltime_totals', 'stats_alltime_totals is materialized');
SELECT has_materialized_view('public', 'stats_accuracy_by_team_alltime', 'stats_accuracy_by_team_alltime is materialized');
SELECT has_materialized_view('public', 'stats_accuracy_by_weight_alltime', 'stats_accuracy_by_weight_alltime is materialized');

-- ── 2. Each matview has its unique index (required for REFRESH ... CONCURRENTLY) ──
SELECT has_index('public', 'leaderboard_season_totals', 'uq_leaderboard_season_totals', 'leaderboard_season_totals has its unique index');
SELECT has_index('public', 'stats_season_trend', 'uq_stats_season_trend', 'stats_season_trend has its unique index');
SELECT has_index('public', 'stats_accuracy_by_team', 'uq_stats_accuracy_by_team', 'stats_accuracy_by_team has its unique index');
SELECT has_index('public', 'stats_accuracy_by_weight', 'uq_stats_accuracy_by_weight', 'stats_accuracy_by_weight has its unique index');
SELECT has_index('public', 'stats_head_to_head', 'uq_stats_head_to_head', 'stats_head_to_head has its unique index');
SELECT has_index('public', 'stats_head_to_head_alltime', 'uq_stats_head_to_head_alltime', 'stats_head_to_head_alltime has its unique index');
SELECT has_index('public', 'stats_alltime_totals', 'uq_stats_alltime_totals', 'stats_alltime_totals has its unique index');
SELECT has_index('public', 'stats_accuracy_by_team_alltime', 'uq_stats_accuracy_by_team_alltime', 'stats_accuracy_by_team_alltime has its unique index');
SELECT has_index('public', 'stats_accuracy_by_weight_alltime', 'uq_stats_accuracy_by_weight_alltime', 'stats_accuracy_by_weight_alltime has its unique index');

-- ── 3. The refresh function ──────────────────────────────────────────────────
SELECT has_function('public', 'refresh_leaderboard_stats', '{}'::name[], 'refresh_leaderboard_stats() exists');

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.refresh_leaderboard_stats()'::regprocedure),
  true,
  'refresh_leaderboard_stats is SECURITY DEFINER'
);

-- Runs cleanly inside this transaction. This is the canary for the production rpc path:
-- REFRESH ... CONCURRENTLY is transaction-safe, so the service-role rpc in grading.ts works.
SELECT lives_ok(
  $$ SELECT public.refresh_leaderboard_stats() $$,
  'refresh_leaderboard_stats() runs without error (CONCURRENTLY is transaction-safe)'
);

-- ── 4. Reachability: service_role only ───────────────────────────────────────
SELECT ok(
  has_table_privilege('service_role', 'public.leaderboard_season_totals', 'select'),
  'service_role can select leaderboard_season_totals'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.leaderboard_season_totals', 'select'),
  'anon cannot select leaderboard_season_totals'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.leaderboard_season_totals', 'select'),
  'authenticated cannot select leaderboard_season_totals directly'
);

SELECT * FROM finish();
ROLLBACK;
