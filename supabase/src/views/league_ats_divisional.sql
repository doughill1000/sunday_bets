-- Favorite ATS cover rate split by divisional vs non-divisional matchup for the /league
-- situational-angles module (#425, wave C). One row per (season_year, is_divisional): how
-- often the favorite covers when the two teams share a division vs when they do not.
--
-- A divisional matchup is same conference AND same division (division names like 'East'
-- repeat across conferences, so both must match), read from teams.division / teams.conference
-- (seeded for the 32 NFL teams in 0229_seed_team_divisions.sql) joined via the opponent
-- carried on league_ats_base.opponent_team_id. Games where either side has no
-- division/conference -- e.g. a non-NFL league, per the epic's non-goal -- cannot be
-- classified and are excluded.
--
-- Grain mirrors league_ats_fav_dog: one favorite-perspective row per game (is_favorite =
-- true), so favorite_covers + underdog_covers + pushes = games. is_divisional is symmetric
-- across the two sides, so restricting to the favorite row is exactly one row per game.
--
-- Plain view over the service_role-only league_ats_base matview; matches that grant and
-- carries no RLS. New file for #425.
create or replace view public.league_ats_divisional as
select
  b.season_year,
  (t.conference = o.conference and t.division = o.division) as is_divisional,
  count(*)::int as games,
  count(*) filter (where b.ats_result = 'win')::int as favorite_covers,
  count(*) filter (where b.ats_result = 'loss')::int as underdog_covers,
  count(*) filter (where b.ats_result = 'push')::int as pushes
from public.league_ats_base b
join public.teams t on t.id = b.team_id
join public.teams o on o.id = b.opponent_team_id
where b.is_favorite is true
  and t.division is not null
  and t.conference is not null
  and o.division is not null
  and o.conference is not null
group by b.season_year, (t.conference = o.conference and t.division = o.division);

revoke all on public.league_ats_divisional from public, anon, authenticated;
grant select on public.league_ats_divisional to service_role;
