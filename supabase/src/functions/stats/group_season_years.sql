-- group_season_years: the distinct season years a group has standings for, newest
-- first (issue #152). Backs getAvailableSeasons, which previously loaded every
-- leaderboard_season_totals row for the group (members x seasons) just to derive the
-- distinct year list -- an unbounded read as groups grow. Pushing the DISTINCT into
-- SQL bounds the result to the (small) number of seasons.
--
-- SECURITY INVOKER, service_role-only -- same trust model as leaderboard_season_page:
-- the source matview is service_role-only (#191) and the server passes the caller's
-- own group_id. service_role EXECUTE comes from the blanket admin grant.
create or replace function public.group_season_years(p_group_id uuid)
returns setof int
language sql
stable
as $$
  select distinct season_year
  from public.leaderboard_season_totals
  where group_id = p_group_id
  order by season_year desc;
$$;

comment on function public.group_season_years(uuid) is
  'Distinct season years a group has standings for, newest first (issue #152). '
  'service_role-only; bounds the season-dropdown read.';
