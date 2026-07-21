-- League-wide home/away x favorite/underdog ATS cover rates for the /league market-cuts
-- module (#425, wave B). One row per (season_year, is_home, is_favorite) -- the four
-- quadrants (home favorite, home underdog, away favorite, away underdog) aggregated across
-- ALL teams. This is the league-wide counterpart to the per-team league_ats_situational
-- (same crossing of the two dimensions, summed over teams).
--
-- Grain is the team-perspective row, so each game contributes two rows (one per side); that
-- is intentional -- a quadrant rate like "road underdogs cover X%" counts each qualifying
-- team-game. Pick'em games (is_favorite null) have no favorite/underdog side and are
-- excluded, exactly like league_ats_fav_dog / league_ats_situational. Cover percentages are
-- derived in the read model (ats_wins / (ats_wins + ats_losses), pushes excluded).
--
-- Plain view over the service_role-only league_ats_base matview (no duplicated aggregation);
-- matches that grant and carries no RLS. New file for #425.
-- Re-touched for #734 (ATS favorite-sign fix): this view's own definition is unchanged, but
-- its OUTPUT changes, because league_ats_base.is_favorite was inverted on every row until
-- #734. The re-touch is also what makes the generator recreate this view after that matview's
-- cascade drop -- see the DEPENDENTS list in league_ats_base.sql.
create or replace view public.league_ats_quadrants as
select
  b.season_year,
  b.is_home,
  b.is_favorite,
  count(*)::int as games,
  count(*) filter (where b.ats_result = 'win')::int as ats_wins,
  count(*) filter (where b.ats_result = 'loss')::int as ats_losses,
  count(*) filter (where b.ats_result = 'push')::int as ats_pushes
from public.league_ats_base b
where b.is_favorite is not null
group by b.season_year, b.is_home, b.is_favorite;

revoke all on public.league_ats_quadrants from public, anon, authenticated;
grant select on public.league_ats_quadrants to service_role;
