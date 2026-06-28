-- Materialized (issue #191): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
-- DROP MATERIALIZED VIEW (not DROP VIEW): #191 made this a matview, so re-emission of this
-- file runs against an existing matview, and `drop view` errors on a matview.
drop materialized view if exists public.stats_accuracy_by_weight_alltime;

create materialized view public.stats_accuracy_by_weight_alltime as
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
-- Join through to weeks only to exclude non-scoring rounds (ADR-0016); 1:1, so otherwise
-- unchanged.
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
where w.is_scoring
group by ps.user_id, u.display_name, p.weight, ps.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the group_id read filter.
create unique index if not exists uq_stats_accuracy_by_weight_alltime
  on public.stats_accuracy_by_weight_alltime (group_id, user_id, weight);

revoke all on public.stats_accuracy_by_weight_alltime from public, anon, authenticated;
grant select on public.stats_accuracy_by_weight_alltime to service_role;
