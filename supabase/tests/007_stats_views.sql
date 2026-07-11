begin;

select plan(25);

select has_materialized_view('public', 'stats_head_to_head', 'stats_head_to_head exists');
select has_materialized_view('public', 'stats_head_to_head_alltime', 'stats_head_to_head_alltime exists');
select has_materialized_view('public', 'stats_accuracy_by_team', 'stats_accuracy_by_team exists');
select has_materialized_view('public', 'stats_accuracy_by_weight', 'stats_accuracy_by_weight exists');
select has_materialized_view('public', 'stats_season_trend', 'stats_season_trend exists');
select has_materialized_view('public', 'stats_alltime_totals', 'stats_alltime_totals exists');
select has_materialized_view('public', 'stats_accuracy_by_team_alltime', 'stats_accuracy_by_team_alltime exists');
select has_materialized_view('public', 'stats_accuracy_by_weight_alltime', 'stats_accuracy_by_weight_alltime exists');

select columns_are(
  'public',
  'stats_season_trend',
  array[
    'group_id', 'user_id', 'display_name', 'season_year', 'week_number', 'week_points',
    'week_wins', 'week_losses', 'week_pushes', 'week_missed', 'is_dropped_week',
    'cumulative_points', 'season_total', 'cumulative_rank_this_week'
  ],
  'stats_season_trend includes group_id and matches WeeklyCumulativeEntry'
);

select tests.create_supabase_user('stats_a');
select tests.create_supabase_user('stats_b');

update public.users
set display_name = case id
  when tests.get_supabase_uid('stats_a') then 'Stats A'
  when tests.get_supabase_uid('stats_b') then 'Stats B'
end
where id in (
  tests.get_supabase_uid('stats_a'),
  tests.get_supabase_uid('stats_b')
);

insert into public.groups (id, name)
values ('00000000-0000-4000-8000-000000000007', 'Stats Group')
on conflict (id) do nothing;

insert into public.group_memberships (group_id, user_id, role)
values
  ('00000000-0000-4000-8000-000000000007', tests.get_supabase_uid('stats_a'), 'member'),
  ('00000000-0000-4000-8000-000000000007', tests.get_supabase_uid('stats_b'), 'member')
on conflict (group_id, user_id) do nothing;

insert into public.seasons (league, year)
values ('NFL', 2040), ('NFL', 2042), ('NFL', 2044)
on conflict (league, year) do nothing;

insert into public.weeks (season_id, week_number, start_ts, end_ts)
values (
  (select id from public.seasons where league = 'NFL' and year = 2040),
  1,
  '2040-09-01 00:00:00+00',
  '2040-09-08 00:00:00+00'
)
on conflict (season_id, week_number) do nothing;

insert into public.weeks (season_id, week_number, start_ts, end_ts)
values (
  (select id from public.seasons where league = 'NFL' and year = 2042),
  1,
  '2042-09-01 00:00:00+00',
  '2042-09-08 00:00:00+00'
)
on conflict (season_id, week_number) do nothing;

insert into public.weeks (season_id, week_number, start_ts, end_ts)
values (
  (select id from public.seasons where league = 'NFL' and year = 2044),
  1,
  '2044-09-01 00:00:00+00',
  '2044-09-08 00:00:00+00'
)
on conflict (season_id, week_number) do nothing;

-- Three teams so the three games can each be a distinct matchup. The
-- uq_games_matchup constraint forbids duplicate (week, home, away) rows.
-- stats_a's picks (STATS_A / STATS_B) are what the team-accuracy assertions
-- pin, so every game stats_a picks in still contains the team it picks;
-- stats_b's picked team is never asserted, so STATS_C/STATS_D stand in where needed.
-- STATS_D is used in the 2044 agreement/opposite fixture for the opposite-picks filter test.
insert into public.teams (external_key, name, short_name)
values
  ('STATS_A', 'Stats Team A', 'STA'),
  ('STATS_B', 'Stats Team B', 'STB'),
  ('STATS_C', 'Stats Team C', 'STC'),
  ('STATS_D', 'Stats Team D', 'STD')
on conflict (external_key) do nothing;

insert into public.games (
  week_id,
  external_game_id,
  commence_time,
  home_team_id,
  away_team_id,
  status
)
select
  w.id,
  game.external_game_id,
  game.commence_time,
  home.id,
  away.id,
  'final'
from public.weeks w
cross join (
  values
    ('stats-game-1', '2040-09-01 17:00:00+00'::timestamptz, 'STATS_A', 'STATS_B'),
    ('stats-game-2', '2040-09-01 20:00:00+00'::timestamptz, 'STATS_B', 'STATS_C'),
    ('stats-game-3', '2040-09-02 00:00:00+00'::timestamptz, 'STATS_A', 'STATS_C')
) game(external_game_id, commence_time, home_key, away_key)
join public.teams home on home.external_key = game.home_key
join public.teams away on away.external_key = game.away_key
where w.season_id = (select id from public.seasons where league = 'NFL' and year = 2040)
  and w.week_number = 1
on conflict (external_game_id) do nothing;

insert into public.games (
  week_id,
  external_game_id,
  commence_time,
  home_team_id,
  away_team_id,
  status
)
select
  w.id,
  'stats-game-4',
  '2042-09-01 17:00:00+00',
  home.id,
  away.id,
  'final'
from public.weeks w
join public.teams home on home.external_key = 'STATS_A'
join public.teams away on away.external_key = 'STATS_B'
where w.season_id = (select id from public.seasons where league = 'NFL' and year = 2042)
  and w.week_number = 1
on conflict (external_game_id) do nothing;

-- 2044: two games to test the opposite-picks filter.
-- game-5: agreement game — both players pick the same team (STATS_D home) → must be excluded.
-- game-6: opposite game — stats_a picks STATS_B (home), stats_b picks STATS_D (away) → included.
insert into public.games (
  week_id,
  external_game_id,
  commence_time,
  home_team_id,
  away_team_id,
  status
)
select
  w.id,
  game.external_game_id,
  game.commence_time,
  home.id,
  away.id,
  'final'
from public.weeks w
cross join (
  values
    ('stats-game-5', '2044-09-01 17:00:00+00'::timestamptz, 'STATS_D', 'STATS_C'),
    ('stats-game-6', '2044-09-01 20:00:00+00'::timestamptz, 'STATS_B', 'STATS_D')
) game(external_game_id, commence_time, home_key, away_key)
join public.teams home on home.external_key = game.home_key
join public.teams away on away.external_key = game.away_key
where w.season_id = (select id from public.seasons where league = 'NFL' and year = 2044)
  and w.week_number = 1
on conflict (external_game_id) do nothing;

insert into public.picks (
  group_id,
  user_id,
  game_id,
  picked_team_id,
  weight,
  locked_at,
  locked_spread_team_id,
  locked_spread_value,
  locked_by
)
select
  '00000000-0000-4000-8000-000000000007',
  player.user_id,
  g.id,
  team.id,
  pick.weight::public.weight_enum,
  g.commence_time - interval '1 hour',
  team.id,
  0,
  player.user_id
from (
  values
    ('stats_a', 'stats-game-1', 'STATS_A', 'L'),
    ('stats_a', 'stats-game-2', 'STATS_B', 'A'),
    ('stats_a', 'stats-game-3', 'STATS_A', 'M'),
    ('stats_a', 'stats-game-4', 'STATS_A', 'H'),
    -- 2044: game-5 agreement (both pick STATS_D), game-6 opposite (stats_a STATS_B, stats_b STATS_D)
    ('stats_a', 'stats-game-5', 'STATS_D', 'L'),
    ('stats_a', 'stats-game-6', 'STATS_B', 'L'),
    ('stats_b', 'stats-game-1', 'STATS_B', 'M'),
    ('stats_b', 'stats-game-2', 'STATS_C', 'H'),
    ('stats_b', 'stats-game-3', 'STATS_C', 'A'),
    ('stats_b', 'stats-game-4', 'STATS_B', 'M'),
    ('stats_b', 'stats-game-5', 'STATS_D', 'M'),
    ('stats_b', 'stats-game-6', 'STATS_D', 'L')
) pick(user_name, external_game_id, team_key, weight)
join lateral (
  select tests.get_supabase_uid(pick.user_name) as user_id
) player on true
join public.games g on g.external_game_id = pick.external_game_id
join public.teams team on team.external_key = pick.team_key
on conflict (group_id, user_id, game_id) do nothing;

insert into public.pick_settlement (
  group_id,
  user_id,
  game_id,
  pick_id,
  points_delta,
  outcome,
  graded_at
)
select
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  result.points_delta,
  result.outcome::public.pick_outcome,
  g.commence_time + interval '4 hours'
from public.picks p
join public.games g on g.id = p.game_id
join lateral (
  values
    (tests.get_supabase_uid('stats_a'), 'stats-game-1', 1, 'win'),
    (tests.get_supabase_uid('stats_a'), 'stats-game-2', -10, 'loss'),
    (tests.get_supabase_uid('stats_a'), 'stats-game-3', 0, 'push'),
    (tests.get_supabase_uid('stats_a'), 'stats-game-4', 5, 'win'),
    -- 2044 fixtures: game-5 agreement, game-6 opposite (stats_b wins game-6)
    (tests.get_supabase_uid('stats_a'), 'stats-game-5', 2, 'win'),
    (tests.get_supabase_uid('stats_a'), 'stats-game-6', -2, 'loss'),
    (tests.get_supabase_uid('stats_b'), 'stats-game-1', -3, 'loss'),
    (tests.get_supabase_uid('stats_b'), 'stats-game-2', 5, 'win'),
    (tests.get_supabase_uid('stats_b'), 'stats-game-3', 0, 'push'),
    (tests.get_supabase_uid('stats_b'), 'stats-game-4', -3, 'loss'),
    (tests.get_supabase_uid('stats_b'), 'stats-game-5', 3, 'win'),
    (tests.get_supabase_uid('stats_b'), 'stats-game-6', 2, 'win')
) result(user_id, external_game_id, points_delta, outcome)
  on result.user_id = p.user_id
 and result.external_game_id = g.external_game_id
on conflict (group_id, user_id, game_id) do update
set
  pick_id = excluded.pick_id,
  points_delta = excluded.points_delta,
  outcome = excluded.outcome,
  graded_at = excluded.graded_at;

-- These are materialized views (issue #191): recompute them so the rows inserted
-- above are visible to the assertions below.
select public.refresh_leaderboard_stats();

select results_eq(
  $$
    select
      games_compared,
      case when user_id = tests.get_supabase_uid('stats_a') then wins else losses end,
      case when user_id = tests.get_supabase_uid('stats_a') then losses else wins end,
      pushes,
      case when user_id = tests.get_supabase_uid('stats_a') then points else opponent_points end,
      case when user_id = tests.get_supabase_uid('stats_a') then opponent_points else points end
    from public.stats_head_to_head
    where season_year = 2040
      and group_id = '00000000-0000-4000-8000-000000000007'
  $$,
  $$ values (3, 1, 1, 1, -9, 2) $$,
  'head-to-head aggregates shared-game weighted results'
);

select results_eq(
  $$
    select
      games_compared,
      case when user_id = tests.get_supabase_uid('stats_a') then wins else losses end,
      case when user_id = tests.get_supabase_uid('stats_a') then losses else wins end,
      pushes,
      case when user_id = tests.get_supabase_uid('stats_a') then points else opponent_points end,
      case when user_id = tests.get_supabase_uid('stats_a') then opponent_points else points end
    from public.stats_head_to_head_alltime
    where group_id = '00000000-0000-4000-8000-000000000007'
  $$,
  $$ values (5, 2, 2, 1, -6, 1) $$,
  'alltime head-to-head counts only opposite-pick games across all seasons'
);

-- Agreement game (game-5, 2044) must be excluded; only the opposite game (game-6) counts.
select results_eq(
  $$
    select
      games_compared,
      case when user_id = tests.get_supabase_uid('stats_a') then wins else losses end,
      case when user_id = tests.get_supabase_uid('stats_a') then losses else wins end,
      pushes,
      case when user_id = tests.get_supabase_uid('stats_a') then points else opponent_points end,
      case when user_id = tests.get_supabase_uid('stats_a') then opponent_points else points end
    from public.stats_head_to_head
    where season_year = 2044
      and group_id = '00000000-0000-4000-8000-000000000007'
  $$,
  $$ values (1, 0, 1, 0, -2, 2) $$,
  'head-to-head excludes agreement games; only opposite-pick games count'
);

select results_eq(
  $$
    select decisions, wins, losses, pushes, points, accuracy
    from public.stats_accuracy_by_team
    where season_year = 2040
      and user_id = tests.get_supabase_uid('stats_a')
      and team_short_name = 'STA'
  $$,
  $$ values (2, 1, 0, 1, 1, 1.0000::numeric) $$,
  'team accuracy groups wins and pushes for the picked team'
);

select results_eq(
  $$
    select decisions, wins, losses, pushes, points, accuracy
    from public.stats_accuracy_by_weight
    where season_year = 2040
      and user_id = tests.get_supabase_uid('stats_a')
      and weight = 'A'
  $$,
  $$ values (1, 0, 1, 0, -10, 0.0000::numeric) $$,
  'weight accuracy includes the All-In record'
);

select results_eq(
  $$
    select week_points, cumulative_points, season_total, cumulative_rank_this_week
    from public.stats_season_trend
    where season_year = 2040
      and user_id = tests.get_supabase_uid('stats_a')
  $$,
  $$ values (-9, -9, -9, 2::bigint) $$,
  'season trend returns weekly, cumulative, total, and rank values'
);

select ok(
  not has_table_privilege('anon', 'public.stats_head_to_head', 'select'),
  'anon cannot select stats views'
);
select ok(
  not has_table_privilege('authenticated', 'public.stats_head_to_head', 'select'),
  'authenticated clients cannot select cross-player stats directly'
);
select ok(
  has_table_privilege('service_role', 'public.stats_head_to_head', 'select'),
  'service_role can select stats views'
);
select ok(
  has_table_privilege('service_role', 'public.stats_head_to_head_alltime', 'select'),
  'service_role can select alltime head-to-head'
);

select results_eq(
  $$
    select total_points, decisions, wins, losses, pushes
    from public.stats_alltime_totals
    where user_id = tests.get_supabase_uid('stats_a')
      and group_id = '00000000-0000-4000-8000-000000000007'
  $$,
  $$ values (-4, 6, 3, 2, 1) $$,
  'alltime totals aggregate across all seasons'
);

select results_eq(
  $$
    select decisions, wins, losses, pushes, points, accuracy
    from public.stats_accuracy_by_team_alltime
    where user_id = tests.get_supabase_uid('stats_a')
      and group_id = '00000000-0000-4000-8000-000000000007'
      and team_short_name = 'STA'
  $$,
  $$ values (3, 2, 0, 1, 6, 1.0000::numeric) $$,
  'alltime team accuracy aggregates across all seasons'
);

select results_eq(
  $$
    select decisions, wins, losses, pushes, points, accuracy
    from public.stats_accuracy_by_weight_alltime
    where user_id = tests.get_supabase_uid('stats_a')
      and group_id = '00000000-0000-4000-8000-000000000007'
      and weight = 'A'
  $$,
  $$ values (1, 0, 1, 0, -10, 0.0000::numeric) $$,
  'alltime weight accuracy aggregates across all seasons'
);

-- The stats_* views are materialized (issues #191/#280/#317/#502). security_invoker is a
-- plain-view reloption matviews can't carry; assert they are matviews (relkind 'm') instead.
-- Count is the family total (11 as of #502's stats_situational_base) — bump it when a
-- stats_* matview is added or removed.
select results_eq(
  $$
    select count(*)::int
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname like 'stats_%'
      and relkind = 'm'
  $$,
  $$ values (11) $$,
  'all stats views are materialized'
);

select tests.clear_authentication();
set role anon;
select throws_ok(
  $$ select * from public.stats_season_trend limit 1 $$,
  '42501',
  'permission denied for materialized view stats_season_trend',
  'anon query is denied'
);
reset role;

set role authenticated;
select throws_ok(
  $$ select * from public.stats_head_to_head_alltime limit 1 $$,
  '42501',
  'permission denied for materialized view stats_head_to_head_alltime',
  'authenticated query is denied for alltime head-to-head'
);
reset role;

select * from finish();
rollback;
