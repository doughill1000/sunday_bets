-- Per-user situational ATS records at CAREER grain (all seasons pooled), in one long/tidy shape
-- the "Your edge" panel (issue #502) consumes uniformly: one row per (group_id, user_id,
-- dimension, bucket) with the player's decisions and win/loss/push record in that situation.
-- Career-first because the edge is meaningful day-one off the imported 2022-24 seasons, where
-- per-season situational samples are still too thin to read (the panel guards on `decisions`).
--
-- Four dimensions, all derived from stats_situational_base so the numbers can never disagree
-- with any other cut:
--   primetime  -> bucket in ('primetime','day')            -- night game vs everything else
--   home_away  -> bucket in ('home','away')                 -- which side the player backed
--   spread     -> bucket in ('pickem','1-3','3.5-6.5','7-9.5','10+')  -- line magnitude
--   divisional -> bucket in ('divisional','non_divisional') -- shared conference AND division
-- bucket_order gives the UI a stable within-dimension sort (e.g. spread ascending by magnitude).
-- Unclassifiable matchups (divisional: a side with no division/conference) are excluded from the
-- divisional dimension but still count in the others, so that dimension's buckets sum only to the
-- picks it can classify, not necessarily to the player's whole record.
--
-- accuracy = wins / (wins + losses), pushes excluded, 4 decimal places -- matching
-- stats_accuracy_by_team so ATS win% reads the same everywhere. A plain view over the
-- service_role-only base matview (no duplicated aggregation); matches that grant and carries no
-- RLS. Sorts alphabetically AFTER stats_situational_base within views/, so the generator emits
-- the base first (see the emit-order note in database.md).

create or replace view public.stats_situational_splits as
with cuts as (
  -- Primetime: night game vs day.
  select
    group_id,
    user_id,
    'primetime'::text as dimension,
    case when is_primetime then 'primetime' else 'day' end as bucket,
    case when is_primetime then 0 else 1 end as bucket_order,
    count(*)::int as decisions,
    count(*) filter (where outcome = 'win')::int as wins,
    count(*) filter (where outcome = 'loss')::int as losses,
    count(*) filter (where outcome = 'push')::int as pushes
  from public.stats_situational_base
  group by group_id, user_id, is_primetime

  union all
  -- Home/away: the side the player backed.
  select
    group_id,
    user_id,
    'home_away',
    case when is_home_pick then 'home' else 'away' end,
    case when is_home_pick then 0 else 1 end,
    count(*)::int,
    count(*) filter (where outcome = 'win')::int,
    count(*) filter (where outcome = 'loss')::int,
    count(*) filter (where outcome = 'push')::int
  from public.stats_situational_base
  group by group_id, user_id, is_home_pick

  union all
  -- Spread magnitude on the picked side.
  select
    group_id,
    user_id,
    'spread',
    (array['pickem', '1-3', '3.5-6.5', '7-9.5', '10+'])[spread_bucket_order + 1],
    spread_bucket_order,
    count(*)::int,
    count(*) filter (where outcome = 'win')::int,
    count(*) filter (where outcome = 'loss')::int,
    count(*) filter (where outcome = 'push')::int
  from public.stats_situational_base
  group by group_id, user_id, spread_bucket_order

  union all
  -- Divisional vs non-divisional; unclassifiable matchups excluded.
  select
    group_id,
    user_id,
    'divisional',
    case when is_divisional then 'divisional' else 'non_divisional' end,
    case when is_divisional then 0 else 1 end,
    count(*)::int,
    count(*) filter (where outcome = 'win')::int,
    count(*) filter (where outcome = 'loss')::int,
    count(*) filter (where outcome = 'push')::int
  from public.stats_situational_base
  where is_divisional is not null
  group by group_id, user_id, is_divisional
)
select
  group_id,
  user_id,
  dimension,
  bucket,
  bucket_order,
  decisions,
  wins,
  losses,
  pushes,
  round(wins::numeric / nullif(wins + losses, 0), 4) as accuracy
from cuts;

revoke all on public.stats_situational_splits from public, anon, authenticated;
grant select on public.stats_situational_splits to service_role;
