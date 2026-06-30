-- One row per user per (group, season) with totals + ranks.
-- Drop-worst-week (ADR-0018, superseding ADR-0005): when a group enables
-- group_config.scoring_rules.drop_worst_week AND sets a
-- drop_worst_week_start_year, a player's single lowest-scoring week is omitted
-- from total_points for that season and every later one, once they have 2+
-- settled weeks. Requiring a start year makes the rule non-retroactive by
-- construction -- seasons before it are always raw, matching the historical
-- sheets exactly. The drop forgives points only -- the W/L/push record and
-- tie-breakers still count the dropped week.
-- The "is drop active for this (group, season_year)" predicate is inlined here
-- (and in stats_alltime_totals.sql / stats_season_trend.sql) rather than pulled
-- into a shared SQL function, to avoid adding another CASCADE dependency edge to
-- the matview re-emission described below (ADR-0018). Keep all three copies
-- textually identical.
-- Materialized (issue #191): season standings are recomputed only at the end of a
-- grading run via public.refresh_leaderboard_stats(), not on every page load. The
-- query body below is unchanged from the prior regular view.
-- DROP MATERIALIZED VIEW (not DROP VIEW): once #191 converted this to a matview, any
-- later re-emission of this file (e.g. issue #152's keyset index below, or #274's
-- is_scoring filter) runs against a DB where it is already a matview, and `drop view`
-- errors on a matview. IF EXISTS keeps the from-empty baseline a clean no-op.
-- CASCADE: two objects hard-depend on this matview and get dropped with it, so both
-- must be touched (re-emitted) in any migration that re-emits this file, or the
-- CASCADE drop has no recreate to pair with:
--   * leaderboard_season_page() is `returns setof` this matview (a hard type
--     dependency); recreated by functions/stats/leaderboard_season_page.sql (emitted
--     after views), with its grant restored by the ADR-0011 ACL guard + service_role
--     default privileges.
--   * league_completed_standings is a plain view selecting from this matview (a
--     regular pg_depend dependency); recreated by
--     views/league_completed_standings.sql (emitted after this file, alphabetically).
drop materialized view if exists public.leaderboard_season_totals cascade;

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
-- Non-scoring rounds (ADR-0016) never count toward standings.
where w.is_scoring
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
-- Resolved drop-worst-week config per group (defaults: off, no start year).
, group_drop as (
select
g.id as group_id,
coalesce((gc.scoring_rules ->> 'drop_worst_week')::boolean, false) as drop_worst_week,
(gc.scoring_rules ->> 'drop_worst_week_start_year')::int as drop_worst_week_start_year
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
-- Drop the single lowest week's points only when the group enables it, a
-- start year is set and this season is at or after it (non-retroactive by
-- construction, ADR-0018), AND the player has 2+ settled weeks. Otherwise the
-- raw total stands -- this is also what keeps every season before the start
-- year byte-identical to the historical sheets.
case
when gd.drop_worst_week
 and gd.drop_worst_week_start_year is not null
 and t.season_year >= gd.drop_worst_week_start_year
 and ws.weeks_played >= 2
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

-- Keyset-pagination index (issue #152, ADR-0002 query discipline). Matches the
-- (group_id, season_year) equality filter plus the exact display ordering used by
-- public.leaderboard_season_page: total_points/wins/pushes descending, with user_id
-- as the unique descending tie-breaker so the keyset cursor is total. Column order
-- and direction mirror that ORDER BY so the keyset row-value comparison and the page
-- limit are both served by a single index range scan (EXPLAIN: Index Scan, no Sort).
create index if not exists idx_leaderboard_season_totals_keyset
  on public.leaderboard_season_totals
  (group_id, season_year, total_points desc, wins desc, pushes desc, user_id desc);

-- Materialized views are NOT covered by the schema-wide `grant select on all tables`
-- (that grant excludes matviews), so service_role is granted explicitly. MVs cannot
-- carry RLS; every read goes through the service-role client, which filters by group_id.
revoke all on public.leaderboard_season_totals from public, anon, authenticated;
grant select on public.leaderboard_season_totals to service_role;
