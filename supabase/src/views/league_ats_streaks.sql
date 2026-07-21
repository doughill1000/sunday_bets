-- Per-team current ATS streak + recent form for the /league depth-&-motion module (#425,
-- wave D -- Hot/Cold). One row per (season_year, team_id): the length and direction of the
-- team's current ATS run plus its last-4 ATS record, ordered by week within the season (a
-- team plays at most once per scoring week).
--
-- Streak rules: streak_result is the team's most-recent cover result; streak_length is the
-- number of consecutive most-recent games that share it. A push carries no cover momentum, so
-- it does NOT extend a win/loss run -- a push mid-run caps the streak at the games since it,
-- and when the most-recent game is a push the streak resets to 0 (streak_result = 'push').
-- last4_* is the win/loss/push tally over the four most-recent games (fewer early in a season).
--
-- Plain view over the service_role-only league_ats_base matview (no duplicated aggregation);
-- matches that grant and carries no RLS. New file for #425.
-- Re-touched for #734 (ATS favorite-sign fix): definition AND output are unchanged -- this
-- view reads only abs(spread_value) / ats_result / is_home, never is_favorite, so the
-- inversion never reached it. The re-touch exists solely so the generator recreates this view
-- after league_ats_base's cascade drop -- see the DEPENDENTS list in league_ats_base.sql.
create or replace view public.league_ats_streaks as
with ordered as (
  select
    b.season_year,
    b.team_id,
    b.week_number,
    b.ats_result,
    row_number() over (
      partition by b.season_year, b.team_id
      order by b.week_number desc, b.game_id desc
    ) as rn
  from public.league_ats_base b
),
most_recent as (
  select season_year, team_id, ats_result as last_result
  from ordered
  where rn = 1
),
first_break as (
  -- Position (counting back from the most-recent game) of the first game whose result differs
  -- from the most-recent one; no row means every game so far shares that result.
  select o.season_year, o.team_id, min(o.rn) as break_rn
  from ordered o
  join most_recent m on m.season_year = o.season_year and m.team_id = o.team_id
  where o.ats_result is distinct from m.last_result
  group by o.season_year, o.team_id
),
totals as (
  select season_year, team_id, count(*) as total_games
  from ordered
  group by season_year, team_id
),
last4 as (
  select
    season_year,
    team_id,
    count(*) filter (where ats_result = 'win')::int as last4_wins,
    count(*) filter (where ats_result = 'loss')::int as last4_losses,
    count(*) filter (where ats_result = 'push')::int as last4_pushes
  from ordered
  where rn <= 4
  group by season_year, team_id
)
select
  m.season_year,
  m.team_id,
  t.name as team_name,
  t.short_name as team_short_name,
  m.last_result as streak_result,
  -- Consecutive most-recent games sharing streak_result. break_rn - 1 leading same-result
  -- games (or all of them when nothing differs); a most-recent push has no active run.
  case
    when m.last_result = 'push' then 0
    else coalesce(fb.break_rn - 1, tot.total_games)::int
  end as streak_length,
  l.last4_wins,
  l.last4_losses,
  l.last4_pushes
from most_recent m
join public.teams t on t.id = m.team_id
join totals tot on tot.season_year = m.season_year and tot.team_id = m.team_id
join last4 l on l.season_year = m.season_year and l.team_id = m.team_id
left join first_break fb on fb.season_year = m.season_year and fb.team_id = m.team_id;

revoke all on public.league_ats_streaks from public, anon, authenticated;
grant select on public.league_ats_streaks to service_role;
