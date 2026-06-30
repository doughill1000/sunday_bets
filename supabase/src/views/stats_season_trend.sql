-- Weekly and cumulative season scoring per group, shaped for WeeklyCumulativeEntry.
-- is_dropped_week (ADR-0018, superseding ADR-0005): true for exactly the single
-- lowest-scoring week (ties broken by earliest week_number) of a player's season,
-- but ONLY when the group's drop-worst-week rule is active for that
-- (group, season_year) -- enabled, a drop_worst_week_start_year is set, this season
-- is at or after it -- AND the player has 2+ settled weeks. This view stays an
-- analytics surface, not a second standings total: week_points/cumulative_points/
-- season_total are always raw, so once the rule is active for a season, the trend's
-- final value intentionally diverges from that season's (adjusted) standings card by
-- exactly the dropped week's points. is_dropped_week exists so the UI can annotate
-- which week caused that gap (Leaderboard-owns-standings / Stats-owns-analytics
-- split, ADR-0018) instead of silently disagreeing with no explanation.
-- The "is drop active for this (group, season_year)" predicate is inlined here (and in
-- leaderboard_season_totals.sql / stats_alltime_totals.sql) rather than pulled into a
-- shared SQL function, to avoid adding another CASCADE dependency edge to the matview
-- re-emission described below (ADR-0018). Keep all three copies textually identical.
-- Materialized (issue #191): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
-- DROP MATERIALIZED VIEW (not DROP VIEW): #191 made this a matview, so re-emission of this
-- file runs against an existing matview, and `drop view` errors on a matview.
drop materialized view if exists public.stats_season_trend;

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
  -- Non-scoring rounds (ADR-0016) never count toward the trend.
  where w.is_scoring
  group by ps.user_id, u.display_name, s.year, w.week_number, ps.group_id
)
-- Per player/season: count of settled weeks (ADR-0018 eligibility gate, mirrors
-- leaderboard_season_totals' week_summary.weeks_played).
, week_summary as (
  select
    user_id,
    season_year,
    group_id,
    count(*)::int as weeks_played
  from week_rows
  group by user_id, season_year, group_id
)
-- Resolved drop-worst-week config per group (defaults: off, no start year).
, group_drop as (
  select
    g.id as group_id,
    coalesce((gc.scoring_rules ->> 'drop_worst_week')::boolean, false) as drop_worst_week,
    (gc.scoring_rules ->> 'drop_worst_week_start_year')::int as drop_worst_week_start_year
  from public.groups g
  left join public.group_config gc on gc.group_id = g.id
)
-- Rank each player's weeks by points ascending (ties broken by earliest week_number)
-- to identify the single droppable week -- the same tie rule as
-- leaderboard_season_totals' min(wk_points), made deterministic here since this view
-- has to single out one row rather than just subtract a minimum.
, ranked as (
  select
    wr.*,
    row_number() over (
      partition by wr.group_id, wr.user_id, wr.season_year
      order by wr.week_points asc, wr.week_number asc
    ) as lowest_rank
  from week_rows wr
), cumulative as (
  select
    ranked.user_id,
    ranked.display_name,
    ranked.season_year,
    ranked.week_number,
    ranked.week_points,
    ranked.week_wins,
    ranked.week_losses,
    ranked.week_pushes,
    ranked.week_missed,
    (
      ranked.lowest_rank = 1
      and gd.drop_worst_week
      and gd.drop_worst_week_start_year is not null
      and ranked.season_year >= gd.drop_worst_week_start_year
      and ws.weeks_played >= 2
    ) as is_dropped_week,
    sum(ranked.week_points) over (
      partition by ranked.group_id, ranked.user_id, ranked.season_year
      order by ranked.week_number
      rows between unbounded preceding and current row
    )::int as cumulative_points,
    ranked.group_id
  from ranked
  join week_summary ws
    on ws.user_id = ranked.user_id
   and ws.season_year = ranked.season_year
   and ws.group_id = ranked.group_id
  join group_drop gd on gd.group_id = ranked.group_id
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
  cumulative.is_dropped_week,
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
