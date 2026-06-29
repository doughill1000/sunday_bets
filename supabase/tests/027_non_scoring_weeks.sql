-- 027_non_scoring_weeks.sql
-- pgTAP for ADR-0016 non-scoring rounds. A graded non-scoring week (here a negative
-- preseason week, is_scoring=false) still has settlements, but must contribute ZERO to
-- every leaderboard/stats materialized view. Also pins the is_scoring column default.

begin;

select plan(11);

-- Column contract -----------------------------------------------------------
select has_column('public', 'weeks', 'is_scoring', 'weeks.is_scoring exists');

-- Players & group -----------------------------------------------------------
select tests.create_supabase_user('ns_a');
select tests.create_supabase_user('ns_b');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('ns_a'), 'player', 'NS Alice'),
  (tests.get_supabase_uid('ns_b'), 'player', 'NS Bob')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000e01', 'Non-Scoring Group');

insert into public.group_memberships (group_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('ns_a'), 'member'),
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('ns_b'), 'member');

-- Schedule: one scoring week (default is_scoring) and one non-scoring preseason week.
insert into public.seasons (id, league, year)
values (9942, 'NFL', 2042)
on conflict (league, year) do nothing;

-- Scoring week inserted WITHOUT is_scoring to exercise the default; preseason week
-- (negative number) explicitly non-scoring.
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99421, 9942, 1, '2042-09-04 00:00:00+00', '2042-09-11 00:00:00+00');
insert into public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) values
  (99422, 9942, -1, '2042-08-07 00:00:00+00', '2042-08-14 00:00:00+00', false);

select is(
  (select is_scoring from public.weeks where id = 99421),
  true,
  'weeks.is_scoring defaults to true'
);

insert into public.teams (external_key, name, short_name) values
  ('NSH', 'NS Home', 'NSH'),
  ('NSA', 'NS Away', 'NSA')
on conflict (external_key) do nothing;

insert into public.games (
  week_id, external_game_id, commence_time, home_team_id, away_team_id, status
)
select g.week_id, g.external_game_id, g.commence_time, home.id, away.id, 'final'
from (
  values
    (99421, 'ns-score', '2042-09-07 17:00:00+00'::timestamptz),
    (99422, 'ns-fun',   '2042-08-10 17:00:00+00'::timestamptz)
) g(week_id, external_game_id, commence_time)
cross join public.teams home
cross join public.teams away
where home.external_key = 'NSH' and away.external_key = 'NSA'
on conflict (external_game_id) do nothing;

-- (player, game) -> (points_delta, outcome). Non-scoring magnitudes are distinct from the
-- scoring ones (within the pick_settlement -20..10 range) so any leak shifts the totals.
create temporary table ns_data (
  user_name        text,
  external_game_id text,
  points_delta     int,
  outcome          text
) on commit drop;

insert into ns_data values
  ('ns_a', 'ns-score',  10, 'win'),
  ('ns_b', 'ns-score',  -5, 'loss'),
  ('ns_a', 'ns-fun',     9, 'win'),
  ('ns_b', 'ns-fun',   -20, 'loss');

insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000e01',
  tests.get_supabase_uid(d.user_name),
  g.id,
  home.id,
  'L'::public.weight_enum,
  g.commence_time - interval '1 hour',
  home.id,
  0,
  tests.get_supabase_uid(d.user_name)
from ns_data d
join public.games g on g.external_game_id = d.external_game_id
join public.teams home on home.external_key = 'NSH'
on conflict (group_id, user_id, game_id) do nothing;

-- ns_b picks the away team (NSA) for the scoring game so it becomes an opposite pick
-- and is eligible for H2H inclusion. Without this, both players pick NSH (agreement)
-- and games_compared would be 0 under the opposite-picks-only H2H definition.
update public.picks
set picked_team_id        = (select id from public.teams where external_key = 'NSA'),
    locked_spread_team_id = (select id from public.teams where external_key = 'NSA')
where user_id = tests.get_supabase_uid('ns_b')
  and game_id = (select id from public.games where external_game_id = 'ns-score');

insert into public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at
)
select
  p.group_id, p.user_id, p.game_id, p.id,
  d.points_delta, d.outcome::public.pick_outcome, g.commence_time + interval '4 hours'
from public.picks p
join public.games g on g.id = p.game_id
join ns_data d
  on tests.get_supabase_uid(d.user_name) = p.user_id
 and d.external_game_id = g.external_game_id
on conflict (group_id, user_id, game_id) do update
set points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;

-- Matviews are refreshed only at the end of a grading run (#191): refresh so the
-- settlements above are visible to the assertions.
select public.refresh_leaderboard_stats();

-- leaderboard_season_totals: only the scoring week counts (10 / -5, not 110 / -105).
select results_eq(
  $$
    select total_points, decisions, wins, losses
    from public.leaderboard_season_totals
    where season_year = 2042
      and group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_a')
  $$,
  $$ values (10, 1, 1, 0) $$,
  'leaderboard_season_totals ignores the non-scoring week for the winner'
);

select results_eq(
  $$
    select total_points, decisions, wins, losses
    from public.leaderboard_season_totals
    where season_year = 2042
      and group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_b')
  $$,
  $$ values (-5, 1, 0, 1) $$,
  'leaderboard_season_totals ignores the non-scoring week for the loser'
);

-- stats_season_trend: the non-scoring week produces no trend row at all.
select is(
  (select count(*)::int from public.stats_season_trend
   where season_year = 2042
     and group_id = '00000000-0000-4000-8000-000000000e01'
     and week_number = -1),
  0,
  'stats_season_trend has no row for the non-scoring week'
);

select results_eq(
  $$
    select week_number, week_points, cumulative_points
    from public.stats_season_trend
    where season_year = 2042
      and group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_a')
  $$,
  $$ values (1, 10, 10) $$,
  'stats_season_trend reflects only the scoring week'
);

-- stats_alltime_totals: 10, not 110.
select results_eq(
  $$
    select total_points, decisions
    from public.stats_alltime_totals
    where group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_a')
  $$,
  $$ values (10, 1) $$,
  'stats_alltime_totals excludes the non-scoring week'
);

-- stats_accuracy_by_team: one scoring decision, 10 points (the all-time join still 1:1).
select results_eq(
  $$
    select decisions, points
    from public.stats_accuracy_by_team
    where season_year = 2042
      and group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_a')
  $$,
  $$ values (1, 10) $$,
  'stats_accuracy_by_team excludes the non-scoring week'
);

select results_eq(
  $$
    select decisions, points
    from public.stats_accuracy_by_weight
    where season_year = 2042
      and group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_a')
  $$,
  $$ values (1, 10) $$,
  'stats_accuracy_by_weight excludes the non-scoring week'
);

-- stats_accuracy_by_team_alltime: proves the newly-added games->weeks join filters too.
select results_eq(
  $$
    select decisions, points
    from public.stats_accuracy_by_team_alltime
    where group_id = '00000000-0000-4000-8000-000000000e01'
      and user_id = tests.get_supabase_uid('ns_a')
  $$,
  $$ values (1, 10) $$,
  'stats_accuracy_by_team_alltime excludes the non-scoring week'
);

-- stats_head_to_head: only the shared scoring game is compared (1, not 2).
select is(
  (select games_compared from public.stats_head_to_head
   where season_year = 2042
     and group_id = '00000000-0000-4000-8000-000000000e01'),
  1,
  'stats_head_to_head compares only the scoring game'
);

select * from finish();
rollback;
