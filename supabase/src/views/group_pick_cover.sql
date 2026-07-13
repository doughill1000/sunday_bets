-- Per-pick against-the-spread cover margin for the weekly-hardware awards (issue #387).
-- One row per settled real pick (pick_id not null) in a scoring round, at the
-- (group_id, game_id, user_id) grain -- the same grain as group_pick_consensus.
--
-- cover_margin: how much the PICKED team covered the locked spread by, from that team's
-- perspective. > 0 the pick covered (a win), = 0 push, < 0 the pick did not cover (a
-- loss). Its sign therefore always agrees with the authoritative ps.outcome carried
-- alongside it. The "Bad Beat of the Week" award ranks losses by this value: the loss
-- with the greatest (closest-to-zero) cover_margin came nearest to covering.
--
-- Line used = the LOCKED line at pick time (picks.locked_spread_team_id / _value, both
-- NOT NULL since 0204_require_locks), NOT the closing line -- grading settled the pick on
-- the locked line, so the cover margin must use the same line to agree with ps.outcome.
--
-- The ATS margin formula is INLINED here rather than calling public.ats_margin_at_lock,
-- even though that function is the canonical definition (grade_pick uses it, ADR-0007).
-- Reason: the ADR-0012 from-empty drift guard (verify-src-reproduces-migrations.ts)
-- applies supabase/src/** in generator phase order -- views emit BEFORE functions, so
-- referencing ats_margin_at_lock makes the view fail to create from empty ("function does
-- not exist"). The real migration chain is unaffected (the function pre-exists from the
-- baseline). Same deliberate duplication as league_ats_base: if ats_margin_at_lock /
-- grade_pick ever changes (ADR-0007), update this expression to match.
--
-- Matviews don't support RLS; all reads are service-role-only (ADR-0013).
-- Non-scoring rounds excluded per ADR-0016 (WHERE w.is_scoring).
-- group_id leads all indexes per ADR-0002.
--
-- Materialized (ADR-0013): refreshed by public.refresh_leaderboard_stats() at the end of
-- a grading run; the unique index below lets that refresh run CONCURRENTLY.

drop materialized view if exists public.group_pick_cover;

create materialized view public.group_pick_cover as
select
  ps.group_id,
  ps.game_id,
  ps.user_id,
  u.display_name,
  s.year as season_year,
  w.week_number,
  ps.outcome,
  -- Picked-team cover margin at the locked line. Home-relative ATS margin first (mirrors
  -- public.ats_margin_at_lock / grade_pick, ADR-0007 -- see header on why this is inlined),
  -- then flip the sign for a pick on the away team so it reads from the picked team's side.
  (
    case
      when p.picked_team_id = g.home_team_id then 1
      else -1
    end
  ) * (
    ((g.final_scores ->> 'home')::int - (g.final_scores ->> 'away')::int)
      + case
          when p.locked_spread_team_id = g.home_team_id then -abs(p.locked_spread_value)
          when p.locked_spread_team_id = g.away_team_id then abs(p.locked_spread_value)
          else 0
        end
  ) as cover_margin
from public.pick_settlement ps
join public.picks p on p.id = ps.pick_id
join public.games g on g.id = ps.game_id
join public.weeks w on w.id = g.week_id
join public.seasons s on s.id = w.season_id
join public.users u on u.id = ps.user_id
where w.is_scoring
  and ps.pick_id is not null
  and (g.final_scores ->> 'home') is not null
  and (g.final_scores ->> 'away') is not null;

-- Unique natural key for REFRESH ... CONCURRENTLY (ADR-0013).
-- group_id leads to serve the (group_id, season_year) read filter (ADR-0002).
create unique index if not exists uq_group_pick_cover
  on public.group_pick_cover (group_id, user_id, game_id);

-- Secondary index for the weekly-award season read.
create index if not exists idx_group_pick_cover_group_season
  on public.group_pick_cover (group_id, season_year);

revoke all on public.group_pick_cover from public, anon, authenticated;
grant select on public.group_pick_cover to service_role;
