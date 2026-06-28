-- Per-pick consensus context for Tier-B identity badges (issue #294, Wave 2 epic #277).
-- One row per (group_id, game_id, user_id) for every non-missed pick in a scoring round.
--
-- consensus_pct: percentage of group pickers who chose the same team as this user.
-- is_minority:   user's pick was the minority opinion (consensus_pct < 50%).
-- graded_outcome: win/loss/push from pick_settlement.
--
-- Shared dependency: also powers AI recap rivalry narratives (#283 Wave 2).
--
-- Matviews don't support RLS; all reads are service-role-only (ADR-0013).
-- Non-scoring rounds excluded per ADR-0016 (WHERE w.is_scoring).
-- group_id leads all indexes per ADR-0002.

drop materialized view if exists public.group_pick_consensus;

create materialized view public.group_pick_consensus as
with pick_counts as (
  -- Per (group, game, team): how many pickers chose that team, and total group picks.
  select
    ps.group_id,
    ps.game_id,
    p.picked_team_id,
    count(*)::int as team_count,
    sum(count(*)) over (partition by ps.group_id, ps.game_id)::int as total_picks
  from public.pick_settlement ps
  join public.picks p on p.id = ps.pick_id
  join public.games g on g.id = ps.game_id
  join public.weeks w on w.id = g.week_id
  where w.is_scoring
    and ps.pick_id is not null
  group by ps.group_id, ps.game_id, p.picked_team_id
)
select
  ps.group_id,
  ps.game_id,
  ps.user_id,
  u.display_name,
  s.year as season_year,
  w.week_number,
  p.picked_team_id,
  round((pc.team_count::numeric / pc.total_picks) * 100, 2) as consensus_pct,
  (pc.team_count::numeric / pc.total_picks) < 0.5 as is_minority,
  ps.outcome as graded_outcome
from public.pick_settlement ps
join public.picks p on p.id = ps.pick_id
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.users u on u.id = ps.user_id
join pick_counts pc
  on  pc.group_id = ps.group_id
  and pc.game_id = ps.game_id
  and pc.picked_team_id = p.picked_team_id
where w.is_scoring
  and ps.pick_id is not null;

-- Unique natural key for REFRESH ... CONCURRENTLY (ADR-0013).
-- group_id leads to serve the (group_id, season_year) read filter (ADR-0002).
create unique index if not exists uq_group_pick_consensus
  on public.group_pick_consensus (group_id, user_id, game_id);

-- Secondary index for badge aggregation by season.
create index if not exists idx_group_pick_consensus_group_season
  on public.group_pick_consensus (group_id, season_year);

revoke all on public.group_pick_consensus from public, anon, authenticated;
grant select on public.group_pick_consensus to service_role;
