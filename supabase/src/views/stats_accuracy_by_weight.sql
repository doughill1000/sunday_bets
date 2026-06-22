create or replace view public.stats_accuracy_by_weight
with (security_invoker = on) as
select
  ps.user_id,
  u.display_name,
  s.year as season_year,
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
  ) as accuracy
from public.pick_settlement ps
join public.picks p on p.id = ps.pick_id
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.users u on u.id = ps.user_id
group by ps.user_id, u.display_name, s.year, p.weight;

revoke all on public.stats_accuracy_by_weight from public, anon, authenticated;
grant select on public.stats_accuracy_by_weight to service_role;
