-- League-wide market ATS cover baseline per situational cut, at SEASON grain -- the season-scoped
-- sibling of league_situational_baseline, giving the /stats situational explorer (issue #514) a
-- per-season market yardstick to subtract from a player's own per-season cover rate. Same
-- backed-side grain and identical classification as league_situational_baseline (so the two agree
-- bucket-for-bucket, and these season rows sum to the career view), but partitioned by season so a
-- season lens compares the player's season cover to that season's market rather than the all-time
-- one.
--
-- Grain matters for a fair comparison (see league_situational_baseline): this aggregates
-- league_ats_base at its atomic (game, team-perspective) grain, matching stats_situational_splits_season's
-- backed-side grain. As there, the symmetric cuts (primetime / spread / divisional) count both
-- perspective rows of each game, so within every such bucket one side covers and the other does
-- not -> ~50% by construction, per season as much as career (an efficient market); home/away is the
-- asymmetric cut carrying that season's real home-side ATS lean.
--
-- A plain view over the service_role-only league_ats_base matview (no duplicated aggregation):
-- matches that grant, carries no RLS (ADR-0013). New file, so it sorts after league_ats_base and
-- league_situational_baseline within views/ and the generator emits the base first (see the
-- emit-order note in database.md). It only READS league_ats_base, so -- like
-- league_situational_baseline itself -- it is not a pre-existing cascade dependent the base's
-- re-emit must re-touch.

create or replace view public.league_situational_baseline_season as
with classified as (
  select
    b.season_year,
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
    season_year,
    'primetime'::text as dimension,
    case when is_primetime then 'primetime' else 'day' end as bucket,
    case when is_primetime then 0 else 1 end as bucket_order,
    count(*) filter (where ats_result = 'win')::int as wins,
    count(*) filter (where ats_result = 'loss')::int as losses,
    count(*) filter (where ats_result = 'push')::int as pushes
  from classified
  group by season_year, is_primetime

  union all
  -- Home/away: the perspective's own side (the "home" bucket is the home-team rows).
  select
    season_year,
    'home_away',
    case when is_home then 'home' else 'away' end,
    case when is_home then 0 else 1 end,
    count(*) filter (where ats_result = 'win')::int,
    count(*) filter (where ats_result = 'loss')::int,
    count(*) filter (where ats_result = 'push')::int
  from classified
  group by season_year, is_home

  union all
  -- Spread magnitude on this side's line.
  select
    season_year,
    'spread',
    (array['pickem', '1-3', '3.5-6.5', '7-9.5', '10+'])[spread_bucket_order + 1],
    spread_bucket_order,
    count(*) filter (where ats_result = 'win')::int,
    count(*) filter (where ats_result = 'loss')::int,
    count(*) filter (where ats_result = 'push')::int
  from classified
  group by season_year, spread_bucket_order

  union all
  -- Divisional vs non-divisional; unclassifiable matchups excluded.
  select
    season_year,
    'divisional',
    case when is_divisional then 'divisional' else 'non_divisional' end,
    case when is_divisional then 0 else 1 end,
    count(*) filter (where ats_result = 'win')::int,
    count(*) filter (where ats_result = 'loss')::int,
    count(*) filter (where ats_result = 'push')::int
  from classified
  where is_divisional is not null
  group by season_year, is_divisional
)
select
  season_year,
  dimension,
  bucket,
  bucket_order,
  (wins + losses + pushes) as decisions,
  wins,
  losses,
  pushes,
  round(wins::numeric / nullif(wins + losses, 0), 4) as accuracy
from cuts;

revoke all on public.league_situational_baseline_season from public, anon, authenticated;
grant select on public.league_situational_baseline_season to service_role;
