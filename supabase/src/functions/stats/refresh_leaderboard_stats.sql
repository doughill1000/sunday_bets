-- Refresh the materialized leaderboard/stats views after a grading run (issue #191).
--
-- SECURITY DEFINER so it executes as the matview owner (postgres) -- REFRESH MATERIALIZED
-- VIEW requires ownership, and the calling service_role is not the owner. search_path is
-- pinned empty with every object schema-qualified.
--
-- CONCURRENTLY keeps each view readable by in-flight requests during the refresh and is
-- transaction-safe inside this function (unlike CREATE INDEX CONCURRENTLY, REFRESH ...
-- CONCURRENTLY does not self-manage transactions); it requires the unique index each
-- matview declares in supabase/src/views/.
--
-- Called by the server grading helpers (src/lib/server/grading.ts) after grade_game /
-- grade_week / grade_season succeed. A refresh failure is logged there but does NOT fail
-- the grade: the settlement write already committed and a stale matview self-heals on the
-- next grade. EXECUTE is granted to service_role by grants/admin_grants.sql (blanket
-- grant on all functions); the closed-by-default ACL guard strips only the PUBLIC grant.
create or replace function public.refresh_leaderboard_stats()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.leaderboard_season_totals;
  refresh materialized view concurrently public.stats_season_trend;
  refresh materialized view concurrently public.stats_accuracy_by_team;
  refresh materialized view concurrently public.stats_accuracy_by_weight;
  refresh materialized view concurrently public.stats_head_to_head;
  refresh materialized view concurrently public.stats_alltime_totals;
  refresh materialized view concurrently public.stats_accuracy_by_team_alltime;
  refresh materialized view concurrently public.stats_accuracy_by_weight_alltime;
end;
$$;

comment on function public.refresh_leaderboard_stats() is
  'Refreshes the 8 leaderboard/stats materialized views CONCURRENTLY (issue #191). '
  'Called after each grading run by src/lib/server/grading.ts.';
