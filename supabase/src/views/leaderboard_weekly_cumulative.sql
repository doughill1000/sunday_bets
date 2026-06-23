-- One row per user per (group, season, week) with week points and running total
create or replace view public.leaderboard_weekly_cumulative as
with week_rows as (
  select
    ps.user_id,
    u.display_name,
    s.year as season_year,
    w.week_number,
    sum(ps.points_delta)::int as week_points,
    count(*) filter (where ps.outcome = 'win')::int   as week_wins,
    count(*) filter (where ps.outcome = 'loss')::int  as week_losses,
    count(*) filter (where ps.outcome = 'push')::int  as week_pushes,
    count(*) filter (where ps.outcome = 'missed')::int as week_missed,
    ps.group_id
  from public.pick_settlement ps
  join public.games   g on g.id = ps.game_id
  join public.weeks   w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users   u on u.id = ps.user_id
  group by ps.user_id, u.display_name, s.year, w.week_number, ps.group_id
),
cum as (
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
    -- running total per (group, user, season) ordered by week
    sum(week_points) over (
      partition by group_id, user_id, season_year
      order by week_number
      rows between unbounded preceding and current row
    )::int as cumulative_points,
    group_id
  from week_rows
)
select
  cum.user_id,
  cum.display_name,
  cum.season_year,
  cum.week_number,
  cum.week_points,
  cum.week_wins,
  cum.week_losses,
  cum.week_pushes,
  cum.week_missed,
  cum.cumulative_points,
  -- season total per (group, user, season)
  sum(cum.week_points) over (
    partition by cum.group_id, cum.user_id, cum.season_year
  )::int as season_total,
  dense_rank() over (
    partition by cum.group_id, cum.season_year, cum.week_number
    order by cum.cumulative_points desc
  ) as cumulative_rank_this_week,
  cum.group_id
from cum;
