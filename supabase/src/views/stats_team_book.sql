-- Per-user, two-sided TEAM BOOK at SEASON grain (issue #564): for every team, the player's ATS
-- record when they BACKED that team (picked it to cover) and when they FADED it (picked its
-- opponent). This adds the "teams you bet against" half stats_accuracy_by_team never had -- that
-- view stores picked_team_id only, so it can describe who you ride but never who you fade.
--
-- Every settled, placed pick in a scoring round emits exactly TWO rows off the same outcome:
--   backed -> (team = picked_team_id)   -- your record riding that team
--   faded  -> (team = the opponent)     -- your record betting against that team
-- so a 9-game slate becomes 18 sided rows before aggregation. The opponent is simply the game's
-- other side (picked_team_id is always the home or away team). "faded" is a pure re-projection of
-- data the pick already carries -- no schema change, no re-grade.
--
-- accuracy = wins / (wins + losses), pushes excluded, 4 dp, matching stats_accuracy_by_team so ATS
-- win% reads the same everywhere; on a faded row that is the player's cover rate AGAINST the team.
-- Non-scoring rounds (ADR-0016) never count (w.is_scoring); missed picks carry no team, so only
-- placed picks count (ps.pick_id is not null) -- the same guards stats_situational_base uses.
--
-- Materialized (ADR-0013): matviews can't carry RLS, so all reads are service-role-only; the
-- unique index leads on group_id (ADR-0002) and is required for REFRESH ... CONCURRENTLY. Reads
-- only base tables (no view dependency), so re-emitting this file needs no cascade re-touch.
-- DROP MATERIALIZED VIEW (not DROP VIEW): re-emission runs against an existing matview.
drop materialized view if exists public.stats_team_book;

create materialized view public.stats_team_book as
with settled as (
  select
    ps.group_id,
    ps.user_id,
    u.display_name,
    s.year as season_year,
    ps.outcome,
    ps.points_delta,
    p.picked_team_id,
    -- The opponent = the game's other side; picked_team_id is always home or away.
    case when p.picked_team_id = g.home_team_id then g.away_team_id else g.home_team_id end
      as opponent_team_id
  from public.pick_settlement ps
  join public.picks p on p.id = ps.pick_id
  join public.games g on g.id = ps.game_id
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users u on u.id = ps.user_id
  -- Non-scoring rounds (ADR-0016) never count; missed picks carry no team.
  where w.is_scoring
    and ps.pick_id is not null
),
sided as (
  select group_id, user_id, display_name, season_year,
    'backed'::text as side, picked_team_id as team_id, outcome, points_delta
  from settled
  union all
  select group_id, user_id, display_name, season_year,
    'faded'::text as side, opponent_team_id as team_id, outcome, points_delta
  from settled
)
select
  sd.user_id,
  sd.display_name,
  sd.season_year,
  sd.side,
  sd.team_id,
  t.name as team_name,
  t.short_name as team_short_name,
  count(*)::int as decisions,
  count(*) filter (where sd.outcome = 'win')::int as wins,
  count(*) filter (where sd.outcome = 'loss')::int as losses,
  count(*) filter (where sd.outcome = 'push')::int as pushes,
  sum(sd.points_delta)::int as points,
  round(
    count(*) filter (where sd.outcome = 'win')::numeric
      / nullif(count(*) filter (where sd.outcome in ('win', 'loss')), 0),
    4
  ) as accuracy,
  sd.group_id
from sided sd
join public.teams t on t.id = sd.team_id
group by sd.user_id, sd.display_name, sd.season_year, sd.side, sd.team_id,
  t.name, t.short_name, sd.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; group_id leads per ADR-0002. side is part of
-- the key because a team can appear once backed and once faded per (user, season).
create unique index if not exists uq_stats_team_book
  on public.stats_team_book (group_id, user_id, season_year, side, team_id);

revoke all on public.stats_team_book from public, anon, authenticated;
grant select on public.stats_team_book to service_role;
