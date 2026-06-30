-- 035_drop_worst_week_reconciliation.sql
-- pgTAP for ADR-0018 (superseding ADR-0005): the cross-surface reconciliation
-- that 013_drop_worst_week.sql doesn't cover (which is scoped to
-- leaderboard_season_totals alone).
--
-- Covers:
--   1. stats_alltime_totals.total_points == sum of each season's drop-aware
--      standings total (career == sum of the season cards), across a player who
--      has one season before drop_worst_week_start_year (raw) and one at/after it
--      (dropped). Record counts (decisions/wins/losses/pushes/missed) stay raw.
--   2. stats_season_trend.is_dropped_week marks exactly the dropped week, only for
--      the active season, never for the pre-start-year season; week_points /
--      cumulative_points / season_total all stay raw regardless.
--   3. drop_worst_week=true with no start_year is inert in BOTH stats_alltime_totals
--      and stats_season_trend, not just leaderboard_season_totals (013 covers that
--      view; this file proves the same inertness on the other two).
--   4. stats_accuracy_by_team / stats_accuracy_by_weight (season-level breakdowns)
--      are unaffected by an active drop -- they read raw pick_settlement rows and
--      never join group_config, so the per-season point adjustment cannot reach
--      them. stats_head_to_head and the *_alltime variants share that same
--      raw-join shape, so they're not re-asserted here.

begin;

select plan(11);

-- Players ---------------------------------------------------------------------
select tests.create_supabase_user('dw2_main');    -- two seasons, one pre/one active
select tests.create_supabase_user('dw2_inert');   -- boolean on, no start_year

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('dw2_main'),  'player', 'DW2 Main'),
  (tests.get_supabase_uid('dw2_inert'), 'player', 'DW2 Inert')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

-- Group D: drop active for seasons >= 2062. Group E: boolean on, no start_year
-- (inert by construction, ADR-0018).
insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000d20', 'Drop Reconcile D'),
  ('00000000-0000-4000-8000-000000000d21', 'Drop Reconcile E');

insert into public.group_memberships (group_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000d20', tests.get_supabase_uid('dw2_main'),  'member'),
  ('00000000-0000-4000-8000-000000000d21', tests.get_supabase_uid('dw2_inert'), 'member');

insert into public.group_config (group_id, line_source, scoring_rules) values
  ('00000000-0000-4000-8000-000000000d20', 'fanduel',
   '{"drop_worst_week": true, "drop_worst_week_start_year": 2062}'),
  ('00000000-0000-4000-8000-000000000d21', 'fanduel',
   '{"drop_worst_week": true}');

insert into public.seasons (id, league, year) values
  (9961, 'NFL', 2061),
  (9962, 'NFL', 2062)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99611, 9961, 1, '2061-09-04 00:00:00+00', '2061-09-11 00:00:00+00'),
  (99612, 9961, 2, '2061-09-11 00:00:00+00', '2061-09-18 00:00:00+00'),
  (99613, 9961, 3, '2061-09-18 00:00:00+00', '2061-09-25 00:00:00+00'),
  (99621, 9962, 1, '2062-09-04 00:00:00+00', '2062-09-11 00:00:00+00'),
  (99622, 9962, 2, '2062-09-11 00:00:00+00', '2062-09-18 00:00:00+00'),
  (99623, 9962, 3, '2062-09-18 00:00:00+00', '2062-09-25 00:00:00+00');

insert into public.teams (external_key, name, short_name) values
  ('DW2H', 'DW2 Home', 'DW2H'),
  ('DW2A', 'DW2 Away', 'DW2A')
on conflict (external_key) do nothing;

insert into public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status
)
select
  g.week_id,
  g.external_game_id,
  g.commence_time,
  home.id,
  away.id,
  'final'
from (
  values
    (99611, 'dw2-2061-w1', '2061-09-07 17:00:00+00'::timestamptz),
    (99612, 'dw2-2061-w2', '2061-09-14 17:00:00+00'::timestamptz),
    (99613, 'dw2-2061-w3', '2061-09-21 17:00:00+00'::timestamptz),
    (99621, 'dw2-2062-w1', '2062-09-07 17:00:00+00'::timestamptz),
    (99622, 'dw2-2062-w2', '2062-09-14 17:00:00+00'::timestamptz),
    (99623, 'dw2-2062-w3', '2062-09-21 17:00:00+00'::timestamptz)
) g(week_id, external_game_id, commence_time)
cross join public.teams home
cross join public.teams away
where home.external_key = 'DW2H' and away.external_key = 'DW2A'
on conflict (external_game_id) do nothing;

create temporary table dw2_data (
  user_name        text,
  group_id         uuid,
  external_game_id text,
  points_delta     int,
  outcome          text
) on commit drop;

insert into dw2_data values
  -- Group D, dw2_main: identical 10/-5/3 profile in both seasons. 2061 is before
  -- start_year (raw 8); 2062 is at/after it (dropped to 13).
  ('dw2_main',  '00000000-0000-4000-8000-000000000d20', 'dw2-2061-w1', 10, 'win'),
  ('dw2_main',  '00000000-0000-4000-8000-000000000d20', 'dw2-2061-w2', -5, 'loss'),
  ('dw2_main',  '00000000-0000-4000-8000-000000000d20', 'dw2-2061-w3',  3, 'win'),
  ('dw2_main',  '00000000-0000-4000-8000-000000000d20', 'dw2-2062-w1', 10, 'win'),
  ('dw2_main',  '00000000-0000-4000-8000-000000000d20', 'dw2-2062-w2', -5, 'loss'),
  ('dw2_main',  '00000000-0000-4000-8000-000000000d20', 'dw2-2062-w3',  3, 'win'),
  -- Group E, dw2_inert: boolean on, no start_year -> inert everywhere.
  ('dw2_inert', '00000000-0000-4000-8000-000000000d21', 'dw2-2062-w1', 10, 'win'),
  ('dw2_inert', '00000000-0000-4000-8000-000000000d21', 'dw2-2062-w2', -5, 'loss');

insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  d.group_id,
  tests.get_supabase_uid(d.user_name),
  g.id,
  home.id,
  'L'::public.weight_enum,
  g.commence_time - interval '1 hour',
  home.id,
  0,
  tests.get_supabase_uid(d.user_name)
from dw2_data d
join public.games g on g.external_game_id = d.external_game_id
join public.teams home on home.external_key = 'DW2H'
on conflict (group_id, user_id, game_id) do nothing;

insert into public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
select
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  d.points_delta,
  d.outcome::public.pick_outcome,
  g.commence_time + interval '4 hours'
from public.picks p
join public.games g on g.id = p.game_id
join dw2_data d
  on d.group_id = p.group_id
 and tests.get_supabase_uid(d.user_name) = p.user_id
 and d.external_game_id = g.external_game_id
on conflict (group_id, user_id, game_id) do update
set points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;

select public.refresh_leaderboard_stats();

-- ── 1. Career == sum of the season cards ──────────────────────────────────────

-- Sanity on the two season cards themselves: 2061 raw (8), 2062 dropped (13).
select results_eq(
  $$
    select season_year, total_points
    from public.leaderboard_season_totals
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
    order by season_year
  $$,
  $$ values (2061, 8), (2062, 13) $$,
  'season cards: 2061 stays raw, 2062 is drop-adjusted'
);

select results_eq(
  $$
    select total_points
    from public.stats_alltime_totals
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
  $$,
  $$ values (21) $$,
  'career total_points equals the sum of the season cards (8 + 13)'
);

select results_eq(
  $$
    select decisions, wins, losses, pushes, missed
    from public.stats_alltime_totals
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
  $$,
  $$ values (6, 4, 2, 0, 0) $$,
  'career record stays raw across both seasons regardless of the drop'
);

-- ── 2. Trend marker: exactly the dropped week, only for the active season ─────

select results_eq(
  $$
    select week_number, is_dropped_week
    from public.stats_season_trend
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
      and season_year = 2062
    order by week_number
  $$,
  $$ values (1, false), (2, true), (3, false) $$,
  'trend marks only the lowest week as dropped, for the active season'
);

select results_eq(
  $$
    select week_points, cumulative_points
    from public.stats_season_trend
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
      and season_year = 2062
    order by week_number
  $$,
  $$ values (10, 10), (-5, 5), (3, 8) $$,
  'trend week_points/cumulative_points stay raw even on the dropped week'
);

select results_eq(
  $$
    select distinct season_total
    from public.stats_season_trend
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
      and season_year = 2062
  $$,
  $$ values (8) $$,
  'trend season_total is raw (8), intentionally diverging from the standings card (13)'
);

select results_eq(
  $$
    select bool_or(is_dropped_week)
    from public.stats_season_trend
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
      and season_year = 2061
  $$,
  $$ values (false) $$,
  'no week is marked dropped in a season before drop_worst_week_start_year'
);

-- ── 3. drop_worst_week=true with no start_year is inert everywhere ────────────

select results_eq(
  $$
    select total_points
    from public.stats_alltime_totals
    where group_id = '00000000-0000-4000-8000-000000000d21'
      and user_id = tests.get_supabase_uid('dw2_inert')
  $$,
  $$ values (5) $$,
  'stats_alltime_totals is inert with no start_year (raw 5, not dropped to 10)'
);

select results_eq(
  $$
    select bool_or(is_dropped_week)
    from public.stats_season_trend
    where group_id = '00000000-0000-4000-8000-000000000d21'
      and user_id = tests.get_supabase_uid('dw2_inert')
  $$,
  $$ values (false) $$,
  'stats_season_trend is inert with no start_year'
);

-- ── 4. Season breakdowns are unaffected by an active drop ─────────────────────
-- (group D's drop is active for 2062; these raw-join views never read group_config.)

select results_eq(
  $$
    select decisions, wins, losses, pushes, points
    from public.stats_accuracy_by_team
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
      and season_year = 2062
      and team_short_name = 'DW2H'
  $$,
  $$ values (3, 2, 1, 0, 8) $$,
  'team-accuracy breakdown reflects raw points even with an active drop'
);

select results_eq(
  $$
    select decisions, wins, losses, pushes, points
    from public.stats_accuracy_by_weight
    where group_id = '00000000-0000-4000-8000-000000000d20'
      and user_id = tests.get_supabase_uid('dw2_main')
      and season_year = 2062
      and weight = 'L'
  $$,
  $$ values (3, 2, 1, 0, 8) $$,
  'weight-accuracy breakdown reflects raw points even with an active drop'
);

select * from finish();
rollback;
