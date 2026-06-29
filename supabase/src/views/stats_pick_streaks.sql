-- Per-player correct-pick streak data for the Hot Hand badge (issue #296, Wave 3 epic #277).
-- One row per (group_id, season_year, user_id):
--
--   current_streak: consecutive wins ending at the most recent graded pick.
--   max_streak:     longest consecutive win run achieved in the season.
--   graded_picks:   non-push picks (wins + losses + missed) used by the sample guard.
--
-- Streak rules (per issue #296):
--   win   → extends the run  (streak + 1)
--   push  → neutral, skipped (run continues, streak unchanged)
--   loss  → ends the run     (streak → 0)
--   missed → ends the run    (streak → 0)
--
-- Ordering by games.commence_time (kickoff); game_id breaks ties deterministically.
-- Non-scoring rounds excluded per ADR-0016 (WHERE w.is_scoring).
-- Matviews don't support RLS; all reads are service-role-only (ADR-0013).
-- group_id leads all indexes per ADR-0002.

drop materialized view if exists public.stats_pick_streaks;

create materialized view public.stats_pick_streaks as
with non_push as (
  -- All graded non-push picks in scoring rounds ordered by kickoff.
  -- Pushes are excluded (neutral): they neither extend nor break a streak.
  select
    ps.group_id,
    s.year                                          as season_year,
    ps.user_id,
    u.display_name,
    g.id                                            as game_id,
    g.commence_time,
    ps.outcome = 'win'::public.pick_outcome         as is_win
  from public.pick_settlement ps
  join public.games   g on g.id = ps.game_id
  join public.weeks   w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users   u on u.id = ps.user_id
  where w.is_scoring
    and ps.outcome is distinct from 'push'::public.pick_outcome
),
-- Assign each row a "break_group" = count of loss/miss events strictly before it.
-- Consecutive wins sharing the same break_group form one unbroken run.
with_break_groups as (
  select
    group_id, season_year, user_id, display_name,
    game_id, commence_time, is_win,
    coalesce(
      sum((not is_win)::int) over (
        partition by group_id, season_year, user_id
        order by commence_time, game_id
        rows between unbounded preceding and 1 preceding
      ), 0
    ) as break_group
  from non_push
),
-- Length of each consecutive win run per (group, season, user, break_group).
run_lengths as (
  select
    group_id, season_year, user_id, display_name,
    break_group,
    count(*) filter (where is_win) as run_length
  from with_break_groups
  group by group_id, season_year, user_id, display_name, break_group
),
-- Most recent loss/miss per player: wins AFTER this event are the current streak.
last_break as (
  select distinct on (group_id, season_year, user_id)
    group_id, season_year, user_id,
    commence_time as last_break_time,
    game_id       as last_break_game_id
  from non_push
  where not is_win
  order by group_id, season_year, user_id, commence_time desc, game_id desc
),
-- Current streak = wins after the last break (all wins if no break ever occurred).
current_streaks as (
  select
    np.group_id, np.season_year, np.user_id,
    count(*) as current_streak
  from non_push np
  left join last_break lb using (group_id, season_year, user_id)
  where np.is_win
    and (
      lb.last_break_time is null
      or np.commence_time > lb.last_break_time
      or (np.commence_time = lb.last_break_time and np.game_id > lb.last_break_game_id)
    )
  group by np.group_id, np.season_year, np.user_id
),
-- Max streak = longest run_length across all break_groups for the player.
max_streaks as (
  select group_id, season_year, user_id, max(run_length) as max_streak
  from run_lengths
  group by group_id, season_year, user_id
),
-- Graded-pick counts (non-push, scoring rounds) for the sample guard.
graded_pick_counts as (
  select
    ps.group_id, s.year as season_year, ps.user_id,
    count(*) as graded_picks
  from public.pick_settlement ps
  join public.games   g on g.id = ps.game_id
  join public.weeks   w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  where w.is_scoring
    and ps.outcome is distinct from 'push'::public.pick_outcome
  group by ps.group_id, s.year, ps.user_id
),
-- All players who have any scoring-round settlement (base population for LEFT JOINs).
all_players as (
  select distinct
    ps.group_id, s.year as season_year, ps.user_id, u.display_name
  from public.pick_settlement ps
  join public.games   g on g.id = ps.game_id
  join public.weeks   w on w.id = g.week_id
  join public.seasons s on s.id = w.season_id
  join public.users   u on u.id = ps.user_id
  where w.is_scoring
)
select
  ap.group_id,
  ap.season_year,
  ap.user_id,
  ap.display_name,
  coalesce(gpc.graded_picks,    0) as graded_picks,
  coalesce(cs.current_streak,   0) as current_streak,
  coalesce(ms.max_streak,       0) as max_streak
from all_players         ap
left join graded_pick_counts gpc using (group_id, season_year, user_id)
left join current_streaks    cs  using (group_id, season_year, user_id)
left join max_streaks        ms  using (group_id, season_year, user_id);

-- Unique natural key for REFRESH ... CONCURRENTLY (ADR-0013).
-- group_id leads to serve the (group_id, season_year) read filter (ADR-0002).
create unique index if not exists uq_stats_pick_streaks
  on public.stats_pick_streaks (group_id, user_id, season_year);

-- Secondary index for badge aggregation by season.
create index if not exists idx_stats_pick_streaks_group_season
  on public.stats_pick_streaks (group_id, season_year);

revoke all on public.stats_pick_streaks from public, anon, authenticated;
grant select on public.stats_pick_streaks to service_role;
