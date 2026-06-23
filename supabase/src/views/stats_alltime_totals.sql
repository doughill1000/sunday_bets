create or replace view public.stats_alltime_totals
with (security_invoker = on) as
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

revoke all on public.stats_alltime_totals from public, anon, authenticated;
grant select on public.stats_alltime_totals to service_role;
