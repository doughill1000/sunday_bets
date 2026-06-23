create or replace view public.stats_accuracy_by_weight_alltime
with (security_invoker = on) as
select
  ps.user_id,
  u.display_name,
  p.weight,
  count(*)::int as decisions,
  count(*) filter (where ps.outcome = 'win')::int as wins,
  count(*) filter (where ps.outcome = 'loss')::int as losses,
  count(*) filter (where ps.outcome = 'push')::int as pushes,
  sum(ps.points_delta)::int as points,
  round(
    count(*) filter (where ps.outcome = 'win')::numeric
      / nullif(count(*) filter (where ps.outcome in ('win', 'loss')), 0),
    4
  ) as accuracy,
  ps.group_id
from public.pick_settlement ps
join public.picks p on p.id = ps.pick_id
join public.users u on u.id = ps.user_id
group by ps.user_id, u.display_name, p.weight, ps.group_id;

revoke all on public.stats_accuracy_by_weight_alltime from public, anon, authenticated;
grant select on public.stats_accuracy_by_weight_alltime to service_role;
