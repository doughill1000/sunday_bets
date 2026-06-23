-- Weekly and cumulative season scoring, shaped for WeeklyCumulativeEntry.
create or replace view public.stats_season_trend
with (security_invoker = on) as
with week_rows as (
  select
    ps.user_id,
    u.display_name,
    s.year as season_year,
    w.week_number,
    sum(ps.points_delta)::int as week_points,
    count(*) filter (where ps.outcome = 'win')::int as week_wins,
    count(*) filter (where ps.outcome = 'loss')::int as week_losses,
    count(*) filter (where ps.outcome = 'push')::int as week_pushes,
    count(*) filter (where ps.outcome = 'missed')::int as week_missed
  from public.pick_settlement ps
  join public.games g on g.id = ps.game_id
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users u on u.id = ps.user_id
  group by ps.user_id, u.display_name, s.year, w.week_number
), cumulative as (
  select
    week_rows.*,
    sum(week_points) over (
      partition by user_id, season_year
      order by week_number
      rows between unbounded preceding and current row
    )::int as cumulative_points
  from week_rows
)
select
  cumulative.*,
  sum(week_points) over (
    partition by user_id, season_year
  )::int as season_total,
  dense_rank() over (
    partition by season_year, week_number
    order by cumulative_points desc
  ) as cumulative_rank_this_week
from cumulative;

revoke all on public.stats_season_trend from public, anon, authenticated;
grant select on public.stats_season_trend to service_role;
