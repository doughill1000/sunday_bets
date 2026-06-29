-- One directional row per player pair per group, counting only games where the two
-- players backed opposite teams (different picked_team_id) across all scoring seasons.
-- Games where both backed the same team are excluded — those measure confidence, not
-- disagreement. Missed picks (null pick_id) are inner-dropped and never counted.
-- Materialized (issue #280): refreshed by public.refresh_leaderboard_stats() at the end
-- of a grading run. Matviews don't support security_invoker; all reads are service-role.
drop materialized view if exists public.stats_head_to_head_alltime;

create materialized view public.stats_head_to_head_alltime as
select
  left_ps.user_id,
  left_user.display_name,
  right_ps.user_id as opponent_user_id,
  right_user.display_name as opponent_display_name,
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
join public.picks left_p  on left_p.id  = left_ps.pick_id
join public.picks right_p on right_p.id = right_ps.pick_id
join public.games g on g.id = left_ps.game_id
join public.weeks w on w.id = g.week_id
join public.users left_user on left_user.id = left_ps.user_id
join public.users right_user on right_user.id = right_ps.user_id
-- Non-scoring rounds (ADR-0016) never count. The pair shares one game, so filtering the
-- left settlement's week excludes both sides.
where w.is_scoring
  and left_p.picked_team_id <> right_p.picked_team_id
group by
  left_ps.user_id,
  left_user.display_name,
  right_ps.user_id,
  right_user.display_name,
  left_ps.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the group_id read filter.
create unique index if not exists uq_stats_head_to_head_alltime
  on public.stats_head_to_head_alltime (group_id, user_id, opponent_user_id);

revoke all on public.stats_head_to_head_alltime from public, anon, authenticated;
grant select on public.stats_head_to_head_alltime to service_role;
