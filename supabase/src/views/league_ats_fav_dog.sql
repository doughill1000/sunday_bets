-- Favorite vs. underdog ATS cover counts for the /league fav/dog module (issue #406), at
-- (season_year, week_number) grain so the UI can show both a per-week breakdown and a
-- season aggregate (summed in the read model). Restricted to the favorite-perspective row
-- of each game (is_favorite = true), which is exactly one row per game that has a favorite,
-- so favorite_covers + underdog_covers + pushes = games. Pick'em games (spread_value = 0,
-- is_favorite NULL) have no favorite and are excluded. Cover percentages are derived in the
-- read model (favorite_covers / (favorite_covers + underdog_covers), pushes excluded).
--
-- A plain view over the league_ats_base matview (no duplicated aggregation). Service-role
-- only, matching the base grant; carries no RLS. Selecting from a matview is a hard
-- pg_depend dependency, so `drop materialized view league_ats_base cascade` also drops this
-- view -- re-touch this file in every migration that re-emits league_ats_base.sql (same
-- rule as league_completed_standings).
-- Re-touched unchanged for #425 (League tab v2): the definition below is identical to #406,
-- but this file's hash must change so the generator recreates the view after league_ats_base's
-- cascade drop (see the dependents note in league_ats_base.sql).
-- Re-touched for #734 (ATS favorite-sign fix): this view's own definition is unchanged, but
-- its OUTPUT changes, because league_ats_base.is_favorite was inverted on every row until
-- #734. The re-touch is also what makes the generator recreate this view after that matview's
-- cascade drop -- see the DEPENDENTS list in league_ats_base.sql.
create or replace view public.league_ats_fav_dog as
select
  b.season_year,
  b.week_number,
  count(*)::int as games,
  count(*) filter (where b.ats_result = 'win')::int as favorite_covers,
  count(*) filter (where b.ats_result = 'loss')::int as underdog_covers,
  count(*) filter (where b.ats_result = 'push')::int as pushes
from public.league_ats_base b
where b.is_favorite = true
group by b.season_year, b.week_number;

revoke all on public.league_ats_fav_dog from public, anon, authenticated;
grant select on public.league_ats_fav_dog to service_role;
