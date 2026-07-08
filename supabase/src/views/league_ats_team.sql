-- Per-team, per-season ATS record for the /league per-team table (issue #406): one row
-- per (season_year, team_id) with the overall ATS and straight-up (SU) record plus
-- home/away and favorite/underdog ATS splits. Cover percentages are computed in the read
-- model from these raw counts (wins / (wins + losses), pushes excluded) so the rounding
-- rule lives in one place.
--
-- A plain view over the league_ats_base matview (no aggregation logic is duplicated across
-- the /league surfaces -- they all read base). Reads a service_role-only matview, so it
-- matches that grant and carries no RLS. A plain view selecting from a matview is a hard
-- pg_depend dependency: `drop materialized view league_ats_base cascade` (see that file)
-- also drops THIS view, so this file must be re-touched in every migration that re-emits
-- league_ats_base.sql -- otherwise the CASCADE drop has no recreate to pair with (same
-- rule as league_completed_standings over leaderboard_season_totals).
-- Re-touched unchanged for #425 (League tab v2): the definition below is identical to #406,
-- but this file's hash must change so the generator recreates the view after league_ats_base's
-- cascade drop (see the dependents note in league_ats_base.sql).
create or replace view public.league_ats_team as
select
  b.season_year,
  b.team_id,
  t.name as team_name,
  t.short_name as team_short_name,
  count(*)::int as games,
  count(*) filter (where b.ats_result = 'win')::int as ats_wins,
  count(*) filter (where b.ats_result = 'loss')::int as ats_losses,
  count(*) filter (where b.ats_result = 'push')::int as ats_pushes,
  count(*) filter (where b.su_result = 'win')::int as su_wins,
  count(*) filter (where b.su_result = 'loss')::int as su_losses,
  count(*) filter (where b.su_result = 'push')::int as su_pushes,
  count(*) filter (where b.is_home and b.ats_result = 'win')::int as home_ats_wins,
  count(*) filter (where b.is_home and b.ats_result = 'loss')::int as home_ats_losses,
  count(*) filter (where b.is_home and b.ats_result = 'push')::int as home_ats_pushes,
  count(*) filter (where not b.is_home and b.ats_result = 'win')::int as away_ats_wins,
  count(*) filter (where not b.is_home and b.ats_result = 'loss')::int as away_ats_losses,
  count(*) filter (where not b.is_home and b.ats_result = 'push')::int as away_ats_pushes,
  count(*) filter (where b.is_favorite and b.ats_result = 'win')::int as fav_ats_wins,
  count(*) filter (where b.is_favorite and b.ats_result = 'loss')::int as fav_ats_losses,
  count(*) filter (where b.is_favorite and b.ats_result = 'push')::int as fav_ats_pushes,
  count(*) filter (where b.is_favorite = false and b.ats_result = 'win')::int as dog_ats_wins,
  count(*) filter (where b.is_favorite = false and b.ats_result = 'loss')::int as dog_ats_losses,
  count(*) filter (where b.is_favorite = false and b.ats_result = 'push')::int as dog_ats_pushes
from public.league_ats_base b
join public.teams t on t.id = b.team_id
group by b.season_year, b.team_id, t.name, t.short_name;

revoke all on public.league_ats_team from public, anon, authenticated;
grant select on public.league_ats_team to service_role;
