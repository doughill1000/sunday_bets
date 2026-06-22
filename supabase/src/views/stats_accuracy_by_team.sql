create or replace view public.stats_accuracy_by_team
with (security_invoker = on) as
select
  ps.user_id,
  u.display_name,
  s.year as season_year,
  p.picked_team_id as team_id,
  t.name as team_name,
  t.short_name as team_short_name,
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
join public.teams t on t.id = p.picked_team_id
group by ps.user_id, u.display_name, s.year, p.picked_team_id, t.name, t.short_name;

revoke all on public.stats_accuracy_by_team from public, anon, authenticated;
grant select on public.stats_accuracy_by_team to service_role;
