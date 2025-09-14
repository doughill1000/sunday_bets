-- One row per user per (season, week) with week points and running total
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
    count(*) filter (where ps.outcome = 'missed')::int as week_missed
  from public.pick_settlement ps
  join public.games   g on g.id = ps.game_id
  join public.weeks   w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users   u on u.id = ps.user_id
  group by ps.user_id, u.display_name, s.year, w.week_number
),
cum as (
  select
    week_rows.*,
    -- running total per (user, season) ordered by week
    sum(week_points) over (
      partition by user_id, season_year
      order by week_number
      rows between unbounded preceding and current row
    )::int as cumulative_points
  from week_rows
)
select
  cum.*,
  -- season total per (user, season)
  sum(week_points) over (
    partition by user_id, season_year
  )::int as season_total,
  -- now we can safely rank by the precomputed column
  dense_rank() over (
    partition by season_year, week_number
    order by cum.cumulative_points desc
  ) as cumulative_rank_this_week
from cum;
