-- Per-user situational ATS base at the atomic (group, user, settled pick) grain: one row per
-- placed, graded pick in a scoring round, carrying the four situational dimensions the "Your
-- edge" panel (issue #502) reads from -- primetime slot, the side backed (home/away), the
-- spread-magnitude bucket, and whether the matchup was divisional -- plus the pick's ATS
-- outcome. The per-user counterpart to league_ats_base: where that answers "did the favorite
-- cover?" league-wide, this answers "how did THIS player do?" in each situation. Every
-- stats_situational_* aggregate derives from this matview, so the panel and any future cut can
-- never compute the same record two different ways.
--
-- Classification is read off the LINE AT PICK TIME (picks.locked_spread_*), never re-derived
-- from the closing line, so it needs no re-grade -- the same choice stats_accuracy_by_line_side
-- makes. picked_spread is the locked spread stated on the team the player actually backed
-- (negative = they took the favorite); abs(picked_spread) is the line magnitude the spread
-- bucket groups by, matching league_ats_spread_buckets so the per-user cut lines up with the
-- league baseline. Buckets follow the League tab epic: pick'em (0), 1-3, 3.5-6.5, 7-9.5, 10+.
--
-- is_primetime mirrors league_ats_primetime's slot rule: a night game is one whose kickoff,
-- converted to America/New_York (DST-safe -- EDT in September, EST by January), lands on
-- Thu/Sat/Sun/Mon (dow 4/6/0/1) at hour >= 18 (6pm ET). Everything else -- Sunday afternoon,
-- international mornings, Saturday/holiday day games -- is a day game. Converting rather than
-- reading the raw UTC timestamp is what keeps an 8pm ET kickoff (stored as small-hours UTC of
-- the next day) from being misread as a day game.
--
-- is_divisional is same conference AND same division (division names like 'East' repeat across
-- conferences, so both must match), read from teams.division / teams.conference (seeded for the
-- 32 NFL teams in 0229_seed_team_divisions.sql). It is symmetric across the two sides, so it is
-- a game-level fact independent of which team the player backed. NULL when either side lacks a
-- division/conference (e.g. a non-NFL matchup) -- the divisional aggregate excludes those.
--
-- Only placed picks count (pick_id is not null): a missed pick has a settlement row but no team,
-- so it cannot be classified -- mirroring stats_accuracy_by_line_side. Non-scoring rounds
-- (ADR-0016) are excluded via w.is_scoring. Matviews can't carry RLS, so all reads are
-- service-role-only (ADR-0013); group_id leads the unique index per ADR-0002.
--
-- DROP ... CASCADE (not DROP VIEW): stats_situational_splits selects from this matview (a hard
-- pg_depend edge), so re-emitting this file drops it too -- every migration that re-emits this
-- file must also re-touch stats_situational_splits.sql so the generator bundles its recreate
-- into the same migration (same rule as league_ats_base / league_completed_standings).

drop materialized view if exists public.stats_situational_base cascade;

create materialized view public.stats_situational_base as
with settled as (
  select
    ps.group_id,
    ps.user_id,
    s.year as season_year,
    ps.game_id,
    ps.outcome,
    (p.picked_team_id = g.home_team_id) as is_home_pick,
    (g.commence_time at time zone 'America/New_York') as et,
    -- Spread stated on the side the player backed (line at pick time). locked_spread_value is
    -- NOT NULL on every settled pick (schema 0204_require_locks), the same invariant
    -- stats_accuracy_by_line_side relies on, so picked_spread is always present.
    case
      when p.picked_team_id = p.locked_spread_team_id then p.locked_spread_value
      else -p.locked_spread_value
    end as picked_spread,
    th.division as home_division,
    th.conference as home_conference,
    ta.division as away_division,
    ta.conference as away_conference
  from public.pick_settlement ps
  join public.picks p on p.id = ps.pick_id
  join public.games g on g.id = ps.game_id
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.teams th on th.id = g.home_team_id
  join public.teams ta on ta.id = g.away_team_id
  -- Non-scoring rounds (ADR-0016) never count toward stats; missed picks carry no team.
  where w.is_scoring
    and ps.pick_id is not null
)
select
  group_id,
  user_id,
  season_year,
  game_id,
  outcome,
  is_home_pick,
  (extract(dow from et) in (0, 1, 4, 6) and extract(hour from et) >= 18) as is_primetime,
  -- Spread-magnitude bucket by the picked-side line (pick'em/1-3/3.5-6.5/7-9.5/10+); mirrors
  -- league_ats_spread_buckets so the per-user cut lines up with the league baseline.
  case
    when abs(picked_spread) = 0 then 0
    when abs(picked_spread) <= 3 then 1
    when abs(picked_spread) <= 6.5 then 2
    when abs(picked_spread) <= 9.5 then 3
    else 4
  end as spread_bucket_order,
  -- Divisional matchup; NULL when either side is unclassified (non-NFL), excluded downstream.
  case
    when home_division is null or home_conference is null
      or away_division is null or away_conference is null then null
    else (home_conference = away_conference and home_division = away_division)
  end as is_divisional
from settled;

-- Unique natural key for REFRESH ... CONCURRENTLY (ADR-0013); group_id leads per ADR-0002.
-- (group_id, user_id, game_id) is the pick_settlement primary key, so it is unique here.
create unique index if not exists uq_stats_situational_base
  on public.stats_situational_base (group_id, user_id, game_id);

revoke all on public.stats_situational_base from public, anon, authenticated;
grant select on public.stats_situational_base to service_role;
