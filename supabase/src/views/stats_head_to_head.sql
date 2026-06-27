-- One directional row per player pair per (group, season), comparing shared-game points.
-- Materialized (issue #191): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
drop view if exists public.stats_head_to_head;

create materialized view public.stats_head_to_head as
select
  left_ps.user_id,
  left_user.display_name,
  right_ps.user_id as opponent_user_id,
  right_user.display_name as opponent_display_name,
  s.year as season_year,
  count(*)::int as games_compared,
  count(*) filter (where left_ps.points_delta > right_ps.points_delta)::int as wins,
  count(*) filter (where left_ps.points_delta < right_ps.points_delta)::int as losses,
  count(*) filter (where left_ps.points_delta = right_ps.points_delta)::int as pushes,
  sum(left_ps.points_delta)::int as points,
  sum(right_ps.points_delta)::int as opponent_points,
  left_ps.group_id
from public.pick_settlement left_ps
join public.pick_settlement right_ps
  on right_ps.game_id = left_ps.game_id
 and right_ps.group_id = left_ps.group_id
 and right_ps.user_id > left_ps.user_id
join public.games g on g.id = left_ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.users left_user on left_user.id = left_ps.user_id
join public.users right_user on right_user.id = right_ps.user_id
group by
  left_ps.user_id,
  left_user.display_name,
  right_ps.user_id,
  right_user.display_name,
  s.year,
  left_ps.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the (group_id,
-- season_year) read filter in getStatsForSeason.
create unique index if not exists uq_stats_head_to_head
  on public.stats_head_to_head (group_id, user_id, opponent_user_id, season_year);

revoke all on public.stats_head_to_head from public, anon, authenticated;
grant select on public.stats_head_to_head to service_role;
