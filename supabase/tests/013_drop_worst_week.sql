-- 013_drop_worst_week.sql
-- pgTAP for ADR-0018 (superseding ADR-0005) drop-worst-week in
-- leaderboard_season_totals: non-retroactive start-year scoping plus the
-- original ADR-0005 mechanic (clear-minimum drop, uniform-score drop, <2-week
-- no-op, points-only record handling, cross-group config isolation).

begin;

select plan(8);

select has_materialized_view('public', 'leaderboard_season_totals', 'leaderboard_season_totals exists');

-- Output contract is unchanged by the drop-worst-week rework (type stability).
select columns_are(
  'public',
  'leaderboard_season_totals',
  array[
    'user_id', 'display_name', 'season_year', 'total_points', 'decisions',
    'wins', 'losses', 'pushes', 'missed', 'rank', 'group_id', 'avatar_key'
  ],
  'leaderboard_season_totals matches SeasonLeaderboardEntry columns'
);

-- Players -------------------------------------------------------------------
select tests.create_supabase_user('dw_clear');    -- 3 distinct weekly scores, season >= start_year
select tests.create_supabase_user('dw_uniform');  -- 2 equal weekly scores
select tests.create_supabase_user('dw_single');   -- 1 week only (no drop)
select tests.create_supabase_user('dw_iso');      -- same scores in two groups
select tests.create_supabase_user('dw_pre');      -- dw_clear's profile, season BEFORE start_year
select tests.create_supabase_user('dw_noyear');   -- dw_clear's profile, boolean on but no start_year

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('dw_clear'),   'player', 'DW Clear'),
  (tests.get_supabase_uid('dw_uniform'), 'player', 'DW Uniform'),
  (tests.get_supabase_uid('dw_single'),  'player', 'DW Single'),
  (tests.get_supabase_uid('dw_iso'),     'player', 'DW Iso'),
  (tests.get_supabase_uid('dw_pre'),     'player', 'DW Pre'),
  (tests.get_supabase_uid('dw_noyear'),  'player', 'DW No Year')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

-- Group A enables drop-worst-week scoped to seasons >= 2041 (ADR-0018).
-- Group B has no config row (defaults off). Group C enables the boolean but
-- never sets a start year -- inert by construction regardless of the boolean.
insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000d01', 'Drop Group A'),
  ('00000000-0000-4000-8000-000000000d02', 'Drop Group B'),
  ('00000000-0000-4000-8000-000000000d03', 'Drop Group C');

insert into public.group_memberships (group_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000d01', tests.get_supabase_uid('dw_clear'),   'member'),
  ('00000000-0000-4000-8000-000000000d01', tests.get_supabase_uid('dw_uniform'), 'member'),
  ('00000000-0000-4000-8000-000000000d01', tests.get_supabase_uid('dw_single'),  'member'),
  ('00000000-0000-4000-8000-000000000d01', tests.get_supabase_uid('dw_iso'),     'member'),
  ('00000000-0000-4000-8000-000000000d01', tests.get_supabase_uid('dw_pre'),     'member'),
  ('00000000-0000-4000-8000-000000000d02', tests.get_supabase_uid('dw_iso'),     'member'),
  ('00000000-0000-4000-8000-000000000d03', tests.get_supabase_uid('dw_noyear'),  'member');

insert into public.group_config (group_id, line_source, scoring_rules) values
  ('00000000-0000-4000-8000-000000000d01', 'fanduel',
   '{"drop_worst_week": true, "drop_worst_week_start_year": 2041}'),
  -- Boolean on, no start year: ADR-0018 makes this inert everywhere.
  ('00000000-0000-4000-8000-000000000d03', 'fanduel',
   '{"drop_worst_week": true}');

-- Schedule: one game per week so a week's points equal a single settlement.
-- Season 2041 (>= Group A's start year) plus season 2040 (before it, for the
-- non-retroactivity check).
insert into public.seasons (id, league, year)
values
  (9940, 'NFL', 2040),
  (9941, 'NFL', 2041)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99401, 9940, 1, '2040-09-04 00:00:00+00', '2040-09-11 00:00:00+00'),
  (99402, 9940, 2, '2040-09-11 00:00:00+00', '2040-09-18 00:00:00+00'),
  (99403, 9940, 3, '2040-09-18 00:00:00+00', '2040-09-25 00:00:00+00'),
  (99411, 9941, 1, '2041-09-04 00:00:00+00', '2041-09-11 00:00:00+00'),
  (99412, 9941, 2, '2041-09-11 00:00:00+00', '2041-09-18 00:00:00+00'),
  (99413, 9941, 3, '2041-09-18 00:00:00+00', '2041-09-25 00:00:00+00');

insert into public.teams (external_key, name, short_name) values
  ('DWH', 'Drop Home', 'DWH'),
  ('DWA', 'Drop Away', 'DWA')
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
    (99401, 'dw-pre-w1', '2040-09-07 17:00:00+00'::timestamptz),
    (99402, 'dw-pre-w2', '2040-09-14 17:00:00+00'::timestamptz),
    (99403, 'dw-pre-w3', '2040-09-21 17:00:00+00'::timestamptz),
    (99411, 'dw-w1',     '2041-09-07 17:00:00+00'::timestamptz),
    (99412, 'dw-w2',     '2041-09-14 17:00:00+00'::timestamptz),
    (99413, 'dw-w3',     '2041-09-21 17:00:00+00'::timestamptz)
) g(week_id, external_game_id, commence_time)
cross join public.teams home
cross join public.teams away
where home.external_key = 'DWH' and away.external_key = 'DWA'
on conflict (external_game_id) do nothing;

-- (player, group, week-game) -> (points_delta, outcome). Reused for picks and
-- settlements so the two stay in sync.
create temporary table dw_data (
  user_name        text,
  group_id         uuid,
  external_game_id text,
  points_delta     int,
  outcome          text
) on commit drop;

insert into dw_data values
  -- Group A, drop active for season 2041 (>= start_year)
  ('dw_clear',   '00000000-0000-4000-8000-000000000d01', 'dw-w1',  10, 'win'),
  ('dw_clear',   '00000000-0000-4000-8000-000000000d01', 'dw-w2',  -5, 'loss'),
  ('dw_clear',   '00000000-0000-4000-8000-000000000d01', 'dw-w3',   3, 'win'),
  ('dw_uniform', '00000000-0000-4000-8000-000000000d01', 'dw-w1',   4, 'win'),
  ('dw_uniform', '00000000-0000-4000-8000-000000000d01', 'dw-w2',   4, 'win'),
  ('dw_single',  '00000000-0000-4000-8000-000000000d01', 'dw-w1',   7, 'win'),
  ('dw_iso',     '00000000-0000-4000-8000-000000000d01', 'dw-w1',  10, 'win'),
  ('dw_iso',     '00000000-0000-4000-8000-000000000d01', 'dw-w2',   2, 'win'),
  -- Group A, dw_clear's identical profile but in season 2040 (< start_year):
  -- must stay raw -- this is the non-retroactivity guarantee (ADR-0018).
  ('dw_pre',     '00000000-0000-4000-8000-000000000d01', 'dw-pre-w1', 10, 'win'),
  ('dw_pre',     '00000000-0000-4000-8000-000000000d01', 'dw-pre-w2', -5, 'loss'),
  ('dw_pre',     '00000000-0000-4000-8000-000000000d01', 'dw-pre-w3',  3, 'win'),
  -- Group B, same scores as dw_iso, drop disabled (no config row)
  ('dw_iso',     '00000000-0000-4000-8000-000000000d02', 'dw-w1',  10, 'win'),
  ('dw_iso',     '00000000-0000-4000-8000-000000000d02', 'dw-w2',   2, 'win'),
  -- Group C, dw_clear's identical profile, boolean on but no start_year set:
  -- inert by construction even though the rule would otherwise be eligible.
  ('dw_noyear',  '00000000-0000-4000-8000-000000000d03', 'dw-w1',  10, 'win'),
  ('dw_noyear',  '00000000-0000-4000-8000-000000000d03', 'dw-w2',  -5, 'loss'),
  ('dw_noyear',  '00000000-0000-4000-8000-000000000d03', 'dw-w3',   3, 'win');

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
from dw_data d
join public.games g on g.external_game_id = d.external_game_id
join public.teams home on home.external_key = 'DWH'
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
join dw_data d
  on d.group_id = p.group_id
 and tests.get_supabase_uid(d.user_name) = p.user_id
 and d.external_game_id = g.external_game_id
on conflict (group_id, user_id, game_id) do update
set points_delta = excluded.points_delta,
    outcome      = excluded.outcome,
    graded_at    = excluded.graded_at;

-- leaderboard_season_totals is materialized (issue #191): refresh so the settlements
-- above are visible to the assertions below.
select public.refresh_leaderboard_stats();

-- Clear minimum: raw 8 (10 - 5 + 3), drop the -5 week -> 13. Record (3 decisions,
-- 2 wins, 1 loss) still counts the dropped week (points-only handling).
select results_eq(
  $$
    select total_points, decisions, wins, losses, pushes
    from public.leaderboard_season_totals
    where season_year = 2041
      and group_id = '00000000-0000-4000-8000-000000000d01'
      and user_id = tests.get_supabase_uid('dw_clear')
  $$,
  $$ values (13, 3, 2, 1, 0) $$,
  'drop-worst-week omits the lowest week''s points but keeps the full record'
);

-- Uniform: raw 8 (4 + 4), dropping either equal week -> 4.
select results_eq(
  $$
    select total_points
    from public.leaderboard_season_totals
    where season_year = 2041
      and group_id = '00000000-0000-4000-8000-000000000d01'
      and user_id = tests.get_supabase_uid('dw_uniform')
  $$,
  $$ values (4) $$,
  'drop-worst-week with equal weeks drops one week''s points'
);

-- Single week: rule needs 2+ weeks, so nothing is dropped.
select results_eq(
  $$
    select total_points
    from public.leaderboard_season_totals
    where season_year = 2041
      and group_id = '00000000-0000-4000-8000-000000000d01'
      and user_id = tests.get_supabase_uid('dw_single')
  $$,
  $$ values (7) $$,
  'drop-worst-week does not apply with fewer than two settled weeks'
);

-- Cross-group isolation: identical scores, drop on in A (12 - 2 = 10) and off in
-- B (12). Group B has no config row, proving the default-off / disabled path too.
select results_eq(
  $$
    select group_id, total_points
    from public.leaderboard_season_totals
    where season_year = 2041
      and user_id = tests.get_supabase_uid('dw_iso')
    order by group_id
  $$,
  $$ values
    ('00000000-0000-4000-8000-000000000d01'::uuid, 10),
    ('00000000-0000-4000-8000-000000000d02'::uuid, 12) $$,
  'one group''s drop-worst-week config does not affect another group''s total'
);

-- Non-retroactive (ADR-0018): dw_pre has dw_clear's exact profile (would drop to
-- 13) but in season 2040, before Group A's drop_worst_week_start_year of 2041.
-- The season must stay byte-identical to its raw total.
select results_eq(
  $$
    select total_points
    from public.leaderboard_season_totals
    where season_year = 2040
      and group_id = '00000000-0000-4000-8000-000000000d01'
      and user_id = tests.get_supabase_uid('dw_pre')
  $$,
  $$ values (8) $$,
  'a season before drop_worst_week_start_year is never altered, even when eligible'
);

-- Inert without a start year (ADR-0018): Group C enables the boolean but never
-- sets drop_worst_week_start_year, so the rule has no effect anywhere, by
-- construction -- not even for an otherwise-eligible profile.
select results_eq(
  $$
    select total_points
    from public.leaderboard_season_totals
    where season_year = 2041
      and group_id = '00000000-0000-4000-8000-000000000d03'
      and user_id = tests.get_supabase_uid('dw_noyear')
  $$,
  $$ values (8) $$,
  'drop_worst_week=true with no start_year is inert'
);

select * from finish();
rollback;
