-- Per-user situational ATS records at SEASON grain -- the season-scoped sibling of
-- stats_situational_splits, feeding the /stats situational explorer (issue #514). Same long/tidy
-- shape (one row per group_id, user_id, season_year, dimension, bucket -- with the player's
-- decisions and win/loss/push record in that situation) but partitioned by season, so the
-- explorer's Career-vs-any-season scope control (the #518 dropdown) can finally re-scope the
-- splits -- the one thing the shipped career-only stats_situational_splits could not do.
--
-- The "Your edge" hero stays career (stats_situational_splits) by design -- a single season of any
-- one cut is too thin a sample to trust -- so this view feeds ONLY the browsable explorer, where a
-- thin season cut is shown but visually guarded rather than headlined.
--
-- Four dimensions, identical classification and bucket labels to stats_situational_splits (both
-- derive from stats_situational_base, so these season rows sum exactly to the career rows):
--   primetime  -> bucket in ('primetime','day')
--   home_away  -> bucket in ('home','away')
--   spread     -> bucket in ('pickem','1-3','3.5-6.5','7-9.5','10+')
--   divisional -> bucket in ('divisional','non_divisional')  -- unclassifiable matchups excluded
-- accuracy = wins / (wins + losses), pushes excluded, 4 dp, NULL on a no-decision bucket -- the
-- same math stats_situational_splits uses, so ATS win% reads the same everywhere.
--
-- A plain view over the service_role-only stats_situational_base matview (no duplicated
-- aggregation): matches that grant, carries no RLS (ADR-0013). New file, so it sorts after
-- stats_situational_base and stats_situational_splits within views/ and the generator emits the
-- base first (see the emit-order note in database.md). It only READS the base matview, so -- like
-- the #502 sibling league_situational_baseline -- it is not a pre-existing cascade dependent the
-- base's re-emit must re-touch.

create or replace view public.stats_situational_splits_season as
with cuts as (
  -- Primetime: night game vs day.
  select
    group_id,
    user_id,
    season_year,
    'primetime'::text as dimension,
    case when is_primetime then 'primetime' else 'day' end as bucket,
    case when is_primetime then 0 else 1 end as bucket_order,
    count(*)::int as decisions,
    count(*) filter (where outcome = 'win')::int as wins,
    count(*) filter (where outcome = 'loss')::int as losses,
    count(*) filter (where outcome = 'push')::int as pushes
  from public.stats_situational_base
  group by group_id, user_id, season_year, is_primetime

  union all
  -- Home/away: the side the player backed.
  select
    group_id,
    user_id,
    season_year,
    'home_away',
    case when is_home_pick then 'home' else 'away' end,
    case when is_home_pick then 0 else 1 end,
    count(*)::int,
    count(*) filter (where outcome = 'win')::int,
    count(*) filter (where outcome = 'loss')::int,
    count(*) filter (where outcome = 'push')::int
  from public.stats_situational_base
  group by group_id, user_id, season_year, is_home_pick

  union all
  -- Spread magnitude on the picked side.
  select
    group_id,
    user_id,
    season_year,
    'spread',
    (array['pickem', '1-3', '3.5-6.5', '7-9.5', '10+'])[spread_bucket_order + 1],
    spread_bucket_order,
    count(*)::int,
    count(*) filter (where outcome = 'win')::int,
    count(*) filter (where outcome = 'loss')::int,
    count(*) filter (where outcome = 'push')::int
  from public.stats_situational_base
  group by group_id, user_id, season_year, spread_bucket_order

  union all
  -- Divisional vs non-divisional; unclassifiable matchups excluded.
  select
    group_id,
    user_id,
    season_year,
    'divisional',
    case when is_divisional then 'divisional' else 'non_divisional' end,
    case when is_divisional then 0 else 1 end,
    count(*)::int,
    count(*) filter (where outcome = 'win')::int,
    count(*) filter (where outcome = 'loss')::int,
    count(*) filter (where outcome = 'push')::int
  from public.stats_situational_base
  where is_divisional is not null
  group by group_id, user_id, season_year, is_divisional
)
select
  group_id,
  user_id,
  season_year,
  dimension,
  bucket,
  bucket_order,
  decisions,
  wins,
  losses,
  pushes,
  round(wins::numeric / nullif(wins + losses, 0), 4) as accuracy
from cuts;

revoke all on public.stats_situational_splits_season from public, anon, authenticated;
grant select on public.stats_situational_splits_season to service_role;
