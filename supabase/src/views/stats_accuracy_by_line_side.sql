-- Per-user favorite-vs-underdog pick mix for the Chalk Eater / Dog Lover identity
-- badges (issue #317). One row per (group_id, user_id, season_year) summarising how
-- often a player backs the spread favorite versus the underdog.
--
-- Favorite/underdog is read off the LINE AT PICK TIME (picks.locked_spread_team_id, which
-- lock_pick copies from the canonical game_lines row and which therefore names the
-- FAVORITE), so it never re-derives from the closing line and needs no re-grade:
--   picked_team_id  = locked_spread_team_id -> they backed the favorite  (chalk)
--   picked_team_id <> locked_spread_team_id -> they backed the underdog  (dog)
--   locked_spread_value = 0                 -> pick'em; neither, but still in `decisions`
-- so chalk_picks + dog_picks <= decisions and each ratio is a share of all picks.
--
-- #734: this previously classified on the SIGN of the picked-side spread
-- (`... < 0` = chalk), inherited from the stale "negative = favorite" comment on
-- game_lines.spread_value. Locked values are always non-negative magnitudes, so that test
-- swapped chalk_picks and dog_picks on every row -- inverting the /stats line-side tendency
-- and handing Chalk Eater to every Dog Lover and vice versa. Classify on team identity.
--
-- Matviews don't support RLS; all reads are service-role-only (ADR-0013).
-- Non-scoring rounds excluded per ADR-0016 (WHERE w.is_scoring).
-- group_id leads the unique index per ADR-0002.

drop materialized view if exists public.stats_accuracy_by_line_side;

create materialized view public.stats_accuracy_by_line_side as
select
  ps.user_id,
  u.display_name,
  s.year as season_year,
  count(*)::int as decisions,
  count(*) filter (
    where p.locked_spread_value <> 0
      and p.picked_team_id = p.locked_spread_team_id
  )::int as chalk_picks,
  count(*) filter (
    where p.locked_spread_value <> 0
      and p.picked_team_id <> p.locked_spread_team_id
  )::int as dog_picks,
  ps.group_id
from public.pick_settlement ps
join public.picks p on p.id = ps.pick_id
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.users u on u.id = ps.user_id
-- Non-scoring rounds (ADR-0016) never count toward stats.
where w.is_scoring
  and ps.pick_id is not null
group by ps.user_id, u.display_name, s.year, ps.group_id;

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the (group_id,
-- season_year) read filter in getStatsForSeason.
create unique index if not exists uq_stats_accuracy_by_line_side
  on public.stats_accuracy_by_line_side (group_id, user_id, season_year);

revoke all on public.stats_accuracy_by_line_side from public, anon, authenticated;
grant select on public.stats_accuracy_by_line_side to service_role;
