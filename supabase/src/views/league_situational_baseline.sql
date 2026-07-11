-- League-wide market ATS cover baseline per situational cut, at the BACKED-SIDE grain, for the
-- "Your edge" panel (issue #502, PR 2). One row per (dimension, bucket) giving how often a side
-- taken in that situation covers the spread league-wide -- the market yardstick the panel
-- subtracts from a player's own per-cut cover rate (stats_situational_splits) to compute their
-- edge. The league counterpart to stats_situational_splits: where that answers "how did THIS
-- player do?", this answers "how does the market resolve?" in the same four cuts.
--
-- Grain matters for a fair comparison. stats_situational_splits is at the side the player
-- BACKED (they took a specific team), so this baseline must be too -- it aggregates
-- league_ats_base at its atomic (game, team-perspective) grain, NOT the favorite-perspective
-- league_ats_* aggregates. Comparing a player's mixed favorite/underdog picks in a cut to a
-- favorite-only cover rate would be apples-to-oranges (a dog-backer would be scored against the
-- favorite's rate); the side-grain baseline is exactly what "a side taken here covers X%" means.
-- A consequence of the spread being an efficient market: for the symmetric cuts (both perspective
-- rows of a game share the same primetime slot, spread magnitude, and divisional flag), one side
-- covers and the other does not, so those baselines sit at ~50% by construction -- the honest
-- break-even. home/away is the asymmetric one (the "home" bucket counts only home-perspective
-- rows), so it carries whatever real home-side ATS lean the seasons hold.
--
-- Classification mirrors stats_situational_base EXACTLY so the per-user cut and this baseline line
-- up bucket-for-bucket: primetime slot from kickoff converted to America/New_York (DST-safe: a
-- night game is dow Thu/Sat/Sun/Mon at hour >= 18 ET), spread-magnitude bucket on abs(spread_value)
-- (pick'em/1-3/3.5-6.5/7-9.5/10+), and divisional = same conference AND division (NULL, and so
-- excluded, when either side lacks a division/conference). league_ats_base already restates
-- spread_value team-relative and carries commence_time + opponent_team_id for exactly this.
--
-- Career grain (all seasons pooled, no season_year) to match the panel's career-first framing and
-- give the most stable market estimate. A plain view over the service_role-only league_ats_base
-- matview (no duplicated aggregation): it matches that grant and carries no RLS. New file, so it
-- sorts after league_ats_base within views/ (see the emit-order note in database.md) and the
-- generator emits it after the base it selects from. It only READS league_ats_base, so it is not a
-- cascade dependent that base's re-emit must re-touch (that rule is for pre-existing dependents).
create or replace view public.league_situational_baseline as
with classified as (
  select
    b.ats_result,
    b.is_home,
    (
      extract(dow from (b.commence_time at time zone 'America/New_York')) in (0, 1, 4, 6)
      and extract(hour from (b.commence_time at time zone 'America/New_York')) >= 18
    ) as is_primetime,
    case
      when abs(b.spread_value) = 0 then 0
      when abs(b.spread_value) <= 3 then 1
      when abs(b.spread_value) <= 6.5 then 2
      when abs(b.spread_value) <= 9.5 then 3
      else 4
    end as spread_bucket_order,
    case
      when t.division is null or t.conference is null
        or o.division is null or o.conference is null then null
      else (t.conference = o.conference and t.division = o.division)
    end as is_divisional
  from public.league_ats_base b
  join public.teams t on t.id = b.team_id
  join public.teams o on o.id = b.opponent_team_id
),
cuts as (
  -- Primetime: night game vs day.
  select
    'primetime'::text as dimension,
    case when is_primetime then 'primetime' else 'day' end as bucket,
    case when is_primetime then 0 else 1 end as bucket_order,
    count(*) filter (where ats_result = 'win')::int as wins,
    count(*) filter (where ats_result = 'loss')::int as losses,
    count(*) filter (where ats_result = 'push')::int as pushes
  from classified
  group by is_primetime

  union all
  -- Home/away: the perspective's own side (the "home" bucket is the home-team rows).
  select
    'home_away',
    case when is_home then 'home' else 'away' end,
    case when is_home then 0 else 1 end,
    count(*) filter (where ats_result = 'win')::int,
    count(*) filter (where ats_result = 'loss')::int,
    count(*) filter (where ats_result = 'push')::int
  from classified
  group by is_home

  union all
  -- Spread magnitude on this side's line.
  select
    'spread',
    (array['pickem', '1-3', '3.5-6.5', '7-9.5', '10+'])[spread_bucket_order + 1],
    spread_bucket_order,
    count(*) filter (where ats_result = 'win')::int,
    count(*) filter (where ats_result = 'loss')::int,
    count(*) filter (where ats_result = 'push')::int
  from classified
  group by spread_bucket_order

  union all
  -- Divisional vs non-divisional; unclassifiable matchups excluded.
  select
    'divisional',
    case when is_divisional then 'divisional' else 'non_divisional' end,
    case when is_divisional then 0 else 1 end,
    count(*) filter (where ats_result = 'win')::int,
    count(*) filter (where ats_result = 'loss')::int,
    count(*) filter (where ats_result = 'push')::int
  from classified
  where is_divisional is not null
  group by is_divisional
)
select
  dimension,
  bucket,
  bucket_order,
  (wins + losses + pushes) as decisions,
  wins,
  losses,
  pushes,
  round(wins::numeric / nullif(wins + losses, 0), 4) as accuracy
from cuts;

revoke all on public.league_situational_baseline from public, anon, authenticated;
grant select on public.league_situational_baseline to service_role;
