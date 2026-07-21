-- Favorite ATS cover rate split by kickoff slot for the /league situational-angles module
-- (#425, wave C). One row per (season_year, slot): TNF (Thursday night), SAT (Saturday night,
-- the late-season Sat primetime window), SNF (Sunday night), MNF (Monday night), or 'day'
-- (everything else -- Sunday afternoon, international morning, Saturday and holiday day games).
--
-- The slot is classified from commence_time converted to America/New_York, so it is DST-safe
-- across the season (EDT in September, EST by January): the conversion yields the New York
-- wall-clock, and a night game is one whose ET day-of-week is Thu/Sat/Sun/Mon AND ET hour >= 18
-- (6pm). Using `at time zone` rather than the raw UTC timestamp is what keeps an 8pm ET
-- kickoff -- stored as the small-hours UTC of the next day -- from being misread as a day
-- game, and keeps the classification stable whether the game is played under EDT or EST.
--
-- Grain mirrors league_ats_fav_dog: one favorite-perspective row per game (is_favorite =
-- true), so favorite_covers + underdog_covers + pushes = games. Pick'em games are excluded
-- (no favorite). favorite_covers = favorite ATS win, underdog_covers = favorite ATS loss.
--
-- Plain view over the service_role-only league_ats_base matview; matches that grant and
-- carries no RLS. New file for #425.
-- Re-touched for #734 (ATS favorite-sign fix): this view's own definition is unchanged, but
-- its OUTPUT changes, because league_ats_base.is_favorite was inverted on every row until
-- #734. The re-touch is also what makes the generator recreate this view after that matview's
-- cascade drop -- see the DEPENDENTS list in league_ats_base.sql.
create or replace view public.league_ats_primetime as
with kicked as (
  select
    b.season_year,
    b.ats_result,
    (b.commence_time at time zone 'America/New_York') as et
  from public.league_ats_base b
  where b.is_favorite is true
),
slotted as (
  select
    season_year,
    ats_result,
    case
      when extract(dow from et) = 4 and extract(hour from et) >= 18 then 'TNF'
      when extract(dow from et) = 6 and extract(hour from et) >= 18 then 'SAT'
      when extract(dow from et) = 0 and extract(hour from et) >= 18 then 'SNF'
      when extract(dow from et) = 1 and extract(hour from et) >= 18 then 'MNF'
      else 'day'
    end as slot
  from kicked
)
select
  season_year,
  slot,
  count(*)::int as games,
  count(*) filter (where ats_result = 'win')::int as favorite_covers,
  count(*) filter (where ats_result = 'loss')::int as underdog_covers,
  count(*) filter (where ats_result = 'push')::int as pushes
from slotted
group by season_year, slot;

revoke all on public.league_ats_primetime from public, anon, authenticated;
grant select on public.league_ats_primetime to service_role;
