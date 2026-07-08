-- League-wide home vs. away ATS and straight-up (SU) cover counts for the /league
-- home/away module (issue #406), one row per season_year. Home and away rows are mirror
-- images (each game contributes one of each), so home_games = away_games and home ATS
-- covers are the complement of away ATS covers (pushes aside) -- both sides are surfaced
-- because the module compares them directly. Cover percentages are derived in the read
-- model from these raw counts (covers / (covers + losses), pushes excluded).
--
-- A plain view over the league_ats_base matview (no duplicated aggregation). Service-role
-- only, matching the base grant; carries no RLS. Selecting from a matview is a hard
-- pg_depend dependency, so `drop materialized view league_ats_base cascade` also drops this
-- view -- re-touch this file in every migration that re-emits league_ats_base.sql (same
-- rule as league_completed_standings).
-- Re-touched unchanged for #425 (League tab v2): the definition below is identical to #406,
-- but this file's hash must change so the generator recreates the view after league_ats_base's
-- cascade drop (see the dependents note in league_ats_base.sql).
create or replace view public.league_ats_home_away as
select
  b.season_year,
  count(*) filter (where b.is_home)::int as home_games,
  count(*) filter (where b.is_home and b.ats_result = 'win')::int as home_ats_covers,
  count(*) filter (where b.is_home and b.ats_result = 'loss')::int as home_ats_losses,
  count(*) filter (where b.is_home and b.ats_result = 'push')::int as home_ats_pushes,
  count(*) filter (where b.is_home and b.su_result = 'win')::int as home_su_wins,
  count(*) filter (where b.is_home and b.su_result = 'loss')::int as home_su_losses,
  count(*) filter (where b.is_home and b.su_result = 'push')::int as home_su_pushes,
  count(*) filter (where not b.is_home)::int as away_games,
  count(*) filter (where not b.is_home and b.ats_result = 'win')::int as away_ats_covers,
  count(*) filter (where not b.is_home and b.ats_result = 'loss')::int as away_ats_losses,
  count(*) filter (where not b.is_home and b.ats_result = 'push')::int as away_ats_pushes,
  count(*) filter (where not b.is_home and b.su_result = 'win')::int as away_su_wins,
  count(*) filter (where not b.is_home and b.su_result = 'loss')::int as away_su_losses,
  count(*) filter (where not b.is_home and b.su_result = 'push')::int as away_su_pushes
from public.league_ats_base b
group by b.season_year;

revoke all on public.league_ats_home_away from public, anon, authenticated;
grant select on public.league_ats_home_away to service_role;
