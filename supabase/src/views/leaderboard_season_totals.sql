-- One row per user per (group, season) with totals + ranks.
-- Drop-worst-week (ADR-0005): when a group enables
-- group_config.scoring_rules.drop_worst_week, a player's single lowest-scoring
-- week is omitted from total_points once they have 2+ settled weeks. The drop
-- forgives points only -- the W/L/push record and tie-breakers still count the
-- dropped week.
-- Materialized (issue #191): season standings are recomputed only at the end of a
-- grading run via public.refresh_leaderboard_stats(), not on every page load. The
-- query body below is unchanged from the prior regular view.
drop view if exists public.leaderboard_season_totals;

create materialized view public.leaderboard_season_totals as
with season_rows as (
select
ps.user_id,
u.display_name,
u.avatar_key,
s.year as season_year,
w.id as week_id,
ps.points_delta,
ps.outcome,
ps.group_id
from public.pick_settlement ps
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.users u on u.id = ps.user_id
)
-- Decision-level season aggregates: raw points and the W/L/push record.
-- Record counts intentionally include every week, even one later dropped
-- (ADR-0005: drop-worst-week forgives points, not record).
, totals as (
select
user_id,
display_name,
avatar_key,
season_year,
group_id,
sum(points_delta)::int as raw_total,
count(*)::int as decisions,
count(*) filter (where outcome = 'win')::int as wins,
count(*) filter (where outcome = 'loss')::int as losses,
count(*) filter (where outcome = 'push')::int as pushes,
count(*) filter (where outcome = 'missed')::int as missed
from season_rows
group by user_id, display_name, avatar_key, season_year, group_id
)
-- Week-level points per player, used to find the single lowest week.
, week_points as (
select
user_id,
season_year,
group_id,
week_id,
sum(points_delta)::int as wk_points
from season_rows
group by user_id, season_year, group_id, week_id
)
-- Per player: count of settled weeks and the lowest week's points.
, week_summary as (
select
user_id,
season_year,
group_id,
count(*)::int as weeks_played,
min(wk_points)::int as lowest_week_points
from week_points
group by user_id, season_year, group_id
)
-- Resolved drop-worst-week flag per group (default false when no config row).
, group_drop as (
select
g.id as group_id,
coalesce((gc.scoring_rules ->> 'drop_worst_week')::boolean, false) as drop_worst_week
from public.groups g
left join public.group_config gc on gc.group_id = g.id
)
, adjusted as (
select
t.user_id,
t.display_name,
t.avatar_key,
t.season_year,
t.group_id,
t.decisions,
t.wins,
t.losses,
t.pushes,
t.missed,
-- Drop the single lowest week's points only when the group enables it AND the
-- player has 2+ settled weeks (ADR-0005). Otherwise the raw total stands.
case
when gd.drop_worst_week and ws.weeks_played >= 2
then t.raw_total - ws.lowest_week_points
else t.raw_total
end::int as total_points
from totals t
join week_summary ws
on ws.user_id = t.user_id
and ws.season_year = t.season_year
and ws.group_id = t.group_id
join group_drop gd on gd.group_id = t.group_id
)
select
a.user_id,
a.display_name,
a.season_year,
a.total_points,
a.decisions,
a.wins,
a.losses,
a.pushes,
a.missed,
dense_rank() over (
partition by a.group_id, a.season_year
order by a.total_points desc, a.wins desc, a.pushes desc
) as rank,
a.group_id,
a.avatar_key
from adjusted a;

-- Unique natural key. Required for REFRESH MATERIALIZED VIEW CONCURRENTLY and also
-- serves the (group_id, season_year) read filter in getSeasonLeaderboard.
create unique index if not exists uq_leaderboard_season_totals
  on public.leaderboard_season_totals (group_id, user_id, season_year);

-- Materialized views are NOT covered by the schema-wide `grant select on all tables`
-- (that grant excludes matviews), so service_role is granted explicitly. MVs cannot
-- carry RLS; every read goes through the service-role client, which filters by group_id.
revoke all on public.leaderboard_season_totals from public, anon, authenticated;
grant select on public.leaderboard_season_totals to service_role;
