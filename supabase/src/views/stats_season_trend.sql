-- Weekly and cumulative season scoring per group, shaped for WeeklyCumulativeEntry.
-- Materialized (issue #191): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
drop view if exists public.stats_season_trend;

create materialized view public.stats_season_trend as
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
    count(*) filter (where ps.outcome = 'missed')::int as week_missed,
    ps.group_id
  from public.pick_settlement ps
  join public.games g on g.id = ps.game_id
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users u on u.id = ps.user_id
  group by ps.user_id, u.display_name, s.year, w.week_number, ps.group_id
), cumulative as (
  select
    user_id,
    display_name,
    season_year,
    week_number,
    week_points,
    week_wins,
    week_losses,
    week_pushes,
    week_missed,
    sum(week_points) over (
      partition by group_id, user_id, season_year
      order by week_number
      rows between unbounded preceding and current row
    )::int as cumulative_points,
    group_id
  from week_rows
)
select
  cumulative.user_id,
  cumulative.display_name,
  cumulative.season_year,
  cumulative.week_number,
  cumulative.week_points,
  cumulative.week_wins,
  cumulative.week_losses,
  cumulative.week_pushes,
  cumulative.week_missed,
  cumulative.cumulative_points,
  sum(cumulative.week_points) over (
    partition by cumulative.group_id, cumulative.user_id, cumulative.season_year
  )::int as season_total,
  dense_rank() over (
    partition by cumulative.group_id, cumulative.season_year, cumulative.week_number
    order by cumulative.cumulative_points desc
  ) as cumulative_rank_this_week,
  cumulative.group_id
from cumulative;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the (group_id,
-- season_year) read filter in getWeeklyCumulative.
create unique index if not exists uq_stats_season_trend
  on public.stats_season_trend (group_id, user_id, season_year, week_number);

revoke all on public.stats_season_trend from public, anon, authenticated;
grant select on public.stats_season_trend to service_role;
