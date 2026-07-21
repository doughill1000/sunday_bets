-- Per-team situational ATS split for the pick-card nugget (issue #406, PR 2): one row per
-- (season_year, team_id, is_home, is_favorite) with that team's ATS record in exactly that
-- situational quadrant (home/away x favorite/underdog). The nugget on GameCard.svelte looks
-- up the single row matching this game -- the team's fixed home/away side crossed with
-- favorite/underdog per the current line -- and renders e.g. "6-2 ATS as home favorite (n=8)".
--
-- Reads the same league_ats_base matview as the /league aggregate views, so no aggregation is
-- duplicated (acceptance criterion: the tab and the nugget read one shared source of truth).
-- Unlike league_ats_team's *marginal* home/away and favorite/underdog splits, this crosses the
-- two dimensions, which is what a quadrant like "home favorite" requires. Pick'em games
-- (is_favorite null) have no favorite/underdog quadrant and are excluded here; the nugget omits
-- them too.
--
-- Plain view over a service_role-only matview: it matches that grant and carries no RLS. A
-- plain view selecting from a matview is a hard pg_depend edge, so `drop materialized view
-- league_ats_base cascade` also drops THIS view -- exactly like league_ats_team /
-- league_ats_fav_dog / league_ats_home_away, this file must be re-touched in any migration that
-- re-emits league_ats_base.sql so the generator bundles the recreate into the same migration.
-- Re-touched unchanged for #425 (League tab v2): the definition below is identical to #406,
-- but this file's hash must change so the generator recreates the view after league_ats_base's
-- cascade drop (see the dependents note in league_ats_base.sql).
-- Re-touched for #734 (ATS favorite-sign fix): this view's own definition is unchanged, but
-- its OUTPUT changes, because league_ats_base.is_favorite was inverted on every row until
-- #734. The re-touch is also what makes the generator recreate this view after that matview's
-- cascade drop -- see the DEPENDENTS list in league_ats_base.sql.
create or replace view public.league_ats_situational as
select
  b.season_year,
  b.team_id,
  b.is_home,
  b.is_favorite,
  count(*)::int as games,
  count(*) filter (where b.ats_result = 'win')::int as ats_wins,
  count(*) filter (where b.ats_result = 'loss')::int as ats_losses,
  count(*) filter (where b.ats_result = 'push')::int as ats_pushes
from public.league_ats_base b
where b.is_favorite is not null
group by b.season_year, b.team_id, b.is_home, b.is_favorite;

revoke all on public.league_ats_situational from public, anon, authenticated;
grant select on public.league_ats_situational to service_role;
