-- Materialized (issue #191): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
drop view if exists public.stats_alltime_totals;

create materialized view public.stats_alltime_totals as
select
  ps.user_id,
  u.display_name,
  sum(ps.points_delta)::int as total_points,
  count(*)::int as decisions,
  count(*) filter (where ps.outcome = 'win')::int as wins,
  count(*) filter (where ps.outcome = 'loss')::int as losses,
  count(*) filter (where ps.outcome = 'push')::int as pushes,
  count(*) filter (where ps.outcome = 'missed')::int as missed,
  ps.group_id
from public.pick_settlement ps
join public.users u on u.id = ps.user_id
group by ps.user_id, u.display_name, ps.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the group_id read filter.
create unique index if not exists uq_stats_alltime_totals
  on public.stats_alltime_totals (group_id, user_id);

revoke all on public.stats_alltime_totals from public, anon, authenticated;
grant select on public.stats_alltime_totals to service_role;
