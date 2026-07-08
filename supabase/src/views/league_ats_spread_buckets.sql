-- Favorite ATS cover rate split by spread magnitude for the /league market-cuts module
-- (#425, League tab v2 -- wave B). One row per (season_year, spread bucket) answering "how
-- often does the favorite of this line size cover?". Buckets follow the epic, on the absolute
-- team-relative spread abs(spread_value): pick'em (0), 1-3, 3.5-6.5, 7-9.5, 10+.
--
-- Grain: one representative row per game. For games with a favorite that is the favorite's
-- row (is_favorite = true, exactly one per game) -- matching league_ats_fav_dog -- where
-- favorite_covers = favorite ATS win, underdog_covers = favorite ATS loss, pushes = ATS push,
-- so the three sum to games. Pick'em games have no favorite; the single home-perspective row
-- stands in so the pick'em bucket still reports its game count, but favorite_covers /
-- underdog_covers are 0 there (only pushes, i.e. actual ties, are meaningful) -- the UI shows
-- pick'em for completeness with no favorite/underdog cover split.
--
-- Plain view over the service_role-only league_ats_base matview (no duplicated aggregation);
-- matches that grant and carries no RLS. New file for #425, so the generator emits it after
-- league_ats_base (alphabetically later in views/) in the same migration.
create or replace view public.league_ats_spread_buckets as
with per_game as (
  -- One row per game: the favorite's row where a favorite exists; for a pick'em (no favorite)
  -- the single home row represents the game so its bucket still counts.
  select
    b.season_year,
    b.is_favorite,
    b.ats_result,
    case
      when abs(b.spread_value) = 0 then 0
      when abs(b.spread_value) <= 3 then 1
      when abs(b.spread_value) <= 6.5 then 2
      when abs(b.spread_value) <= 9.5 then 3
      else 4
    end as bucket_order
  from public.league_ats_base b
  where b.is_favorite is true
     or (b.is_favorite is null and b.is_home)
)
select
  season_year,
  bucket_order,
  (array['pickem', '1-3', '3.5-6.5', '7-9.5', '10+'])[bucket_order + 1] as bucket,
  count(*)::int as games,
  count(*) filter (where is_favorite and ats_result = 'win')::int as favorite_covers,
  count(*) filter (where is_favorite and ats_result = 'loss')::int as underdog_covers,
  count(*) filter (where ats_result = 'push')::int as pushes
from per_game
group by season_year, bucket_order;

revoke all on public.league_ats_spread_buckets from public, anon, authenticated;
grant select on public.league_ats_spread_buckets to service_role;
