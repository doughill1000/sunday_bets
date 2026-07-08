-- League-wide, spreads-only NFL team ATS facts at the atomic (game, team-perspective)
-- grain: exactly two rows per qualifying game (one for the home team, one for the away
-- team). Every /league aggregate view and the pick-card ATS nugget (issue #406) derive
-- from THIS matview, so the tab and the nugget can never compute cover math two different
-- ways. League-wide and identical for every user: no group_id, no per-user data.
--
-- Line used = the game's closing line where one exists (is_closing_line, written once at
-- first grade by _capture_closing_line), falling back to the current active line
-- (is_active_line). Historical 2022-24 imports were settled directly and never went
-- through the grading path, so they carry only a single active-line snapshot and no
-- closing flag -- the fallback is what lets those seasons appear at all. 'fanduel' (the
-- default line_source used by grading's coalesce(cfg.line_source,'fanduel')) is preferred
-- when a game has lines from more than one book, so the whole surface reads one book.
--
-- Cover math: `margin` is home-relative (>0 home covered, <0 away covered, =0 push), so
-- each perspective row flips the sign. is_favorite is read off the sign of the closing
-- spread (NULL for a pick'em, spread_value = 0). Only is_scoring weeks (ADR-0016) with
-- BOTH final scores and a usable line are included; games missing a score or a line are
-- dropped (the "~17% missing scores" in older imports render as thinner samples, surfaced
-- via the n= caveat in the UI).
--
-- Widened for the League tab v2 epic (#425) with four reference columns the new aggregate
-- views consume, all at the same (game, team-perspective) grain: spread_value and margin are
-- restated TEAM-RELATIVE (negative spread_value = this team is favored; margin > 0 = this team
-- covered, = 0 push), commence_time carries the kickoff for primetime-slot classification, and
-- opponent_team_id names the other side for divisional matchups. The original home-relative
-- margin still lives in the `scored` CTE below; the per-perspective sign flip happens in the
-- final SELECT alongside ats_result, so the two conventions can never disagree.
--
-- The margin formula is INLINED here rather than calling public.ats_margin_at_lock, even
-- though that function is the canonical definition (grade_pick uses it, ADR-0007). Reason:
-- the ADR-0012 from-empty drift guard (verify-src-reproduces-migrations.ts) applies all of
-- supabase/src/** in generator phase order -- views (this file) emit BEFORE functions, so
-- referencing ats_margin_at_lock makes the view fail to create from empty ("function does
-- not exist"). The real migration chain is unaffected (the function pre-exists from the
-- baseline), but keeping the view self-contained keeps src/** applyable from empty. This is
-- a deliberate, small duplication of the ATS formula: if ats_margin_at_lock/grade_pick ever
-- changes (ADR-0007), update this expression to match.
--
-- Materialized (ADR-0013): refreshed by public.refresh_leaderboard_stats() at the end of a
-- grading run; the unique index below lets that refresh run CONCURRENTLY. Matviews cannot
-- carry RLS, so all reads are service-role-only (the server reads via the service key; the
-- data is league-wide public context with no cross-group/-user dimension to isolate).
-- DROP ... CASCADE (not DROP VIEW): #406 made this a matview and the league_ats_* aggregate
-- views select from it (a hard pg_depend edge), so re-emitting this file drops them too --
-- every migration that re-emits this file must also re-touch each pre-existing dependent so
-- the generator bundles its recreate into the same migration (same rule as
-- league_completed_standings). Dependents as of #425: league_ats_team, league_ats_fav_dog,
-- league_ats_home_away, league_ats_situational (the four recreated unchanged) plus the five
-- #425 aggregates (league_ats_spread_buckets, _quadrants, _primetime, _divisional, _streaks).
-- The five #425 views are new files, so the generator always emits them; the four pre-existing
-- dependents only recreate when their own file hash changes -- which is why each is re-touched.
drop materialized view if exists public.league_ats_base cascade;

create materialized view public.league_ats_base as
with scored as (
  select
    s.year as season_year,
    w.week_number,
    g.id as game_id,
    g.commence_time,
    g.home_team_id,
    g.away_team_id,
    (g.final_scores ->> 'home')::int as home_pts,
    (g.final_scores ->> 'away')::int as away_pts,
    cl.spread_team_id,
    cl.spread_value,
    -- Inlined ATS margin (mirrors public.ats_margin_at_lock / grade_pick, ADR-0007) -- see
    -- the header note on why this is not a function call. Home-relative: apply the spread
    -- against whichever side it favors.
    ((g.final_scores ->> 'home')::int - (g.final_scores ->> 'away')::int)
      + case
          when cl.spread_team_id = g.home_team_id then -abs(cl.spread_value)
          when cl.spread_team_id = g.away_team_id then abs(cl.spread_value)
          else 0
        end as margin
  from public.games g
  join public.weeks w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  -- One line per game: closing where present, else the active snapshot; fanduel-first.
  -- CROSS JOIN LATERAL drops games with no usable line, satisfying "no line -> excluded".
  cross join lateral (
    select gl.spread_team_id, gl.spread_value
    from public.game_lines gl
    where gl.game_id = g.id
      and (gl.is_closing_line or gl.is_active_line)
    order by (gl.source = 'fanduel') desc, gl.is_closing_line desc, gl.fetched_at desc
    limit 1
  ) cl
  where w.is_scoring
    and (g.final_scores ->> 'home') is not null
    and (g.final_scores ->> 'away') is not null
)
select
  sc.season_year,
  sc.week_number,
  sc.game_id,
  sc.commence_time,
  persp.team_id,
  persp.opponent_team_id,
  persp.is_home,
  -- Favored per the closing spread: spread_value < 0 favors spread_team_id, so this team
  -- is favored when it IS the spread team on a negative line, or the OTHER team on a
  -- positive line. NULL on a pick'em (spread_value = 0) so it is excluded from fav/dog
  -- splits but still counted in overall and home/away splits.
  case
    when sc.spread_value = 0 then null
    when persp.team_id = sc.spread_team_id then sc.spread_value < 0
    else sc.spread_value > 0
  end as is_favorite,
  -- Team-relative spread (#425): sc.spread_value is stated on sc.spread_team_id, so flip it
  -- for the other side. Negative = this team favored, positive = underdog, 0 = pick'em;
  -- abs() is the line magnitude league_ats_spread_buckets groups by.
  case
    when persp.team_id = sc.spread_team_id then sc.spread_value
    else -sc.spread_value
  end as spread_value,
  -- Team-relative cover margin (#425): sc.margin is home-relative, so the away perspective
  -- flips the sign. > 0 this team covered by that many points, = 0 push, < 0 did not cover
  -- (always agrees with ats_result below).
  case when persp.is_home then sc.margin else -sc.margin end as margin,
  -- Did THIS team cover? margin is home-relative, so the away perspective flips the sign.
  case
    when sc.margin = 0 then 'push'
    when (persp.is_home and sc.margin > 0) or (not persp.is_home and sc.margin < 0) then 'win'
    else 'loss'
  end as ats_result,
  -- Straight-up (moneyline) result for this team. NFL ties count as a push.
  case
    when sc.home_pts = sc.away_pts then 'push'
    when (persp.is_home and sc.home_pts > sc.away_pts)
      or (not persp.is_home and sc.away_pts > sc.home_pts) then 'win'
    else 'loss'
  end as su_result
from scored sc
cross join lateral (
  values
    (sc.home_team_id, true, sc.away_team_id),
    (sc.away_team_id, false, sc.home_team_id)
) as persp(team_id, is_home, opponent_team_id);

-- Unique natural key for REFRESH ... CONCURRENTLY; also serves the (season_year, team_id)
-- read filters used by the /league aggregates and the per-game nugget lookup.
create unique index if not exists uq_league_ats_base
  on public.league_ats_base (game_id, team_id);

-- Season/team read filters (the aggregate views group by these; PostgREST filters on them).
create index if not exists ix_league_ats_base_season_team
  on public.league_ats_base (season_year, team_id);

revoke all on public.league_ats_base from public, anon, authenticated;
grant select on public.league_ats_base to service_role;
