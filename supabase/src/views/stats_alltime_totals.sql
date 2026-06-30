-- One row per user per group with all-time totals.
-- total_points (ADR-0018, superseding ADR-0005) is the SUM of each season's
-- drop-aware standings total -- i.e. exactly what leaderboard_season_totals would
-- show for each of that player's seasons, added up. This is what makes career ==
-- Sigma(per-season standings cards) true by construction, regardless of whether
-- drop_worst_week is on, off, or scoped to only some seasons via
-- drop_worst_week_start_year. wins/losses/pushes/missed/decisions stay raw sums
-- across every settled pick -- the drop never touches record (ADR-0005's
-- forgive-points-not-record principle).
-- The "is drop active for this (group, season_year)" predicate is inlined here
-- (and in leaderboard_season_totals.sql / stats_season_trend.sql) rather than
-- pulled into a shared SQL function, to avoid adding another CASCADE dependency
-- edge to the matview re-emission described below (ADR-0018). Keep all three
-- copies textually identical.
-- Materialized (issue #191): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
-- DROP MATERIALIZED VIEW (not DROP VIEW): #191 made this a matview, so re-emission of this
-- file runs against an existing matview, and `drop view` errors on a matview.
drop materialized view if exists public.stats_alltime_totals;

create materialized view public.stats_alltime_totals as
with season_rows as (
select
ps.user_id,
ps.group_id,
s.year as season_year,
w.id as week_id,
ps.points_delta,
ps.outcome
from public.pick_settlement ps
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
-- Non-scoring rounds (ADR-0016) never count toward standings.
where w.is_scoring
)
-- Raw record: every settled decision counts, regardless of any later drop.
, alltime_records as (
select
user_id,
group_id,
count(*)::int as decisions,
count(*) filter (where outcome = 'win')::int as wins,
count(*) filter (where outcome = 'loss')::int as losses,
count(*) filter (where outcome = 'push')::int as pushes,
count(*) filter (where outcome = 'missed')::int as missed
from season_rows
group by user_id, group_id
)
-- Per-season raw points, mirroring leaderboard_season_totals' "totals" CTE.
, season_totals as (
select
user_id,
group_id,
season_year,
sum(points_delta)::int as raw_total
from season_rows
group by user_id, group_id, season_year
)
-- Week-level points per player/season, used to find each season's lowest week.
, week_points as (
select
user_id,
group_id,
season_year,
week_id,
sum(points_delta)::int as wk_points
from season_rows
group by user_id, group_id, season_year, week_id
)
, week_summary as (
select
user_id,
group_id,
season_year,
count(*)::int as weeks_played,
min(wk_points)::int as lowest_week_points
from week_points
group by user_id, group_id, season_year
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
-- Per-season drop-adjusted total -- identical predicate and arithmetic to
-- leaderboard_season_totals, so each term here equals that season's card.
, season_adjusted as (
select
st.user_id,
st.group_id,
case
when gd.drop_worst_week
 and gd.drop_worst_week_start_year is not null
 and st.season_year >= gd.drop_worst_week_start_year
 and ws.weeks_played >= 2
then st.raw_total - ws.lowest_week_points
else st.raw_total
end::int as season_total_points
from season_totals st
join week_summary ws
on ws.user_id = st.user_id
and ws.season_year = st.season_year
and ws.group_id = st.group_id
join group_drop gd on gd.group_id = st.group_id
)
, alltime_points as (
select
user_id,
group_id,
sum(season_total_points)::int as total_points
from season_adjusted
group by user_id, group_id
)
select
  ap.user_id,
  u.display_name,
  ap.total_points,
  ar.decisions,
  ar.wins,
  ar.losses,
  ar.pushes,
  ar.missed,
  ap.group_id
from alltime_points ap
join alltime_records ar on ar.user_id = ap.user_id and ar.group_id = ap.group_id
join public.users u on u.id = ap.user_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the group_id read filter.
create unique index if not exists uq_stats_alltime_totals
  on public.stats_alltime_totals (group_id, user_id);

revoke all on public.stats_alltime_totals from public, anon, authenticated;
grant select on public.stats_alltime_totals to service_role;
