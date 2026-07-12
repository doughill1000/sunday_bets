-- Per-user, two-sided TEAM BOOK at CAREER grain (all seasons pooled) -- the all-time sibling of
-- stats_team_book (issue #564). Same backed/faded re-projection: every settled, placed pick in a
-- scoring round emits one BACKED row (picked team) and one FADED row (opponent) off the same
-- outcome, so the career book shows both who the player most reliably rides and who they most
-- reliably fade across every season they've played.
--
-- Career-first because the signature strip and standouts lead the page (#564): per-season fade
-- samples are often too thin to trust, but pooled across the imported 2022-24 seasons a fade
-- record has real weight. accuracy = wins / (wins + losses), pushes excluded, 4 dp -- identical
-- math to stats_team_book so the two scopes read the same.
--
-- Guards mirror stats_team_book exactly: non-scoring rounds excluded (w.is_scoring), placed picks
-- only (ps.pick_id is not null). Materialized, service-role-only (ADR-0013); group_id leads the
-- unique index (ADR-0002). Reads only base tables, so no cascade re-touch on re-emit.
-- DROP MATERIALIZED VIEW (not DROP VIEW): re-emission runs against an existing matview.
drop materialized view if exists public.stats_team_book_alltime;

create materialized view public.stats_team_book_alltime as
with settled as (
  select
    ps.group_id,
    ps.user_id,
    u.display_name,
    ps.outcome,
    ps.points_delta,
    p.picked_team_id,
    case when p.picked_team_id = g.home_team_id then g.away_team_id else g.home_team_id end
      as opponent_team_id
  from public.pick_settlement ps
  join public.picks p on p.id = ps.pick_id
  join public.games g on g.id = ps.game_id
  join public.weeks w on w.id = g.week_id
  join public.users u on u.id = ps.user_id
  where w.is_scoring
    and ps.pick_id is not null
),
sided as (
  select group_id, user_id, display_name,
    'backed'::text as side, picked_team_id as team_id, outcome, points_delta
  from settled
  union all
  select group_id, user_id, display_name,
    'faded'::text as side, opponent_team_id as team_id, outcome, points_delta
  from settled
)
select
  sd.user_id,
  sd.display_name,
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
group by sd.user_id, sd.display_name, sd.side, sd.team_id, t.name, t.short_name, sd.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; group_id leads per ADR-0002.
create unique index if not exists uq_stats_team_book_alltime
  on public.stats_team_book_alltime (group_id, user_id, side, team_id);

revoke all on public.stats_team_book_alltime from public, anon, authenticated;
grant select on public.stats_team_book_alltime to service_role;
