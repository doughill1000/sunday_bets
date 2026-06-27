-- 022_house_grading.sql
-- pgTAP for ADR-0007 House/Gamer grading preset (issue #177).
-- Covers: House parity (identical picks settle identically on closing line),
-- Gamer divergence (pick-time lines differ → different outcomes), closing-line
-- capture write-once, per-settlement freeze (prior gamer settlement survives
-- re-grade in a house group), and new-week House stability.

begin;

select plan(14);

-- Structural ------------------------------------------------------------------
select has_column('public', 'game_lines',      'is_closing_line', 'game_lines has is_closing_line');
select has_column('public', 'pick_settlement', 'graded_preset',   'pick_settlement has graded_preset');

-- Seed ------------------------------------------------------------------------
select tests.create_supabase_user('hg_alice');
select tests.create_supabase_user('hg_bob');
select tests.create_supabase_user('hg_freeze_user');
select tests.create_supabase_user('hg_new_user');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('hg_alice'),        'player', 'HG Alice'),
  (tests.get_supabase_uid('hg_bob'),          'player', 'HG Bob'),
  (tests.get_supabase_uid('hg_freeze_user'),  'player', 'HG Freeze'),
  (tests.get_supabase_uid('hg_new_user'),     'player', 'HG New')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000e01', 'HG House Group'),
  ('00000000-0000-4000-8000-000000000e02', 'HG Gamer Group');

insert into public.group_memberships (group_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('hg_alice'),       'member'),
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('hg_bob'),         'member'),
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('hg_freeze_user'), 'member'),
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('hg_new_user'),    'member'),
  ('00000000-0000-4000-8000-000000000e02', tests.get_supabase_uid('hg_alice'),       'member'),
  ('00000000-0000-4000-8000-000000000e02', tests.get_supabase_uid('hg_bob'),         'member');

insert into public.group_config (group_id, line_source, scoring_rules, grading_preset) values
  ('00000000-0000-4000-8000-000000000e01', 'fanduel', '{}', 'house'),
  ('00000000-0000-4000-8000-000000000e02', 'fanduel', '{}', 'gamer');

insert into public.seasons (id, league, year)
values (9951, 'NFL', 2051)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99511, 9951, 1, '2051-09-04 00:00:00+00', '2051-09-11 00:00:00+00'),
  (99512, 9951, 2, '2051-09-11 00:00:00+00', '2051-09-18 00:00:00+00'),
  (99513, 9951, 3, '2051-09-18 00:00:00+00', '2051-09-25 00:00:00+00');

insert into public.teams (external_key, name, short_name) values
  ('HGH', 'HG Home', 'HGH'),
  ('HGA', 'HG Away', 'HGA')
on conflict (external_key) do nothing;

-- Three games: parity/divergence, freeze re-grade, new-week House.
-- Final score home=14 away=9 for all three; line math:
--   at -3 (Gamer, early lock): margin = (14-9) - 3 =  2 → home covers → win,  L=+1
--   at -6 (closing line):      margin = (14-9) - 6 = -1 → home fails  → loss, L=-1
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select
  g.week_id,
  g.external_game_id,
  g.commence_time,
  home.id,
  away.id,
  'final',
  '{"home": 14, "away": 9}'::jsonb
from (values
  (99511, 'hg-parity', '2051-09-07 17:00:00+00'::timestamptz),
  (99512, 'hg-freeze', '2051-09-14 17:00:00+00'::timestamptz),
  (99513, 'hg-new',    '2051-09-21 17:00:00+00'::timestamptz)
) g(week_id, external_game_id, commence_time)
cross join public.teams home
cross join public.teams away
where home.external_key = 'HGH' and away.external_key = 'HGA'
on conflict (external_game_id) do nothing;

-- hg-parity lines: early (-3), closing (-6), and post-kickoff (-7, must be ignored).
-- Closing line = last row with fetched_at <= commence_time, so -6 wins.
insert into public.game_lines (game_id, source, spread_team_id, spread_value, fetched_at)
select g.id, 'fanduel', home.id, l.spread_value, l.fetched_at
from public.games g
cross join public.teams home
cross join (values
  (-3::numeric, '2051-09-07 15:00:00+00'::timestamptz),
  (-6::numeric, '2051-09-07 16:30:00+00'::timestamptz),
  (-7::numeric, '2051-09-07 17:01:00+00'::timestamptz)
) l(spread_value, fetched_at)
where g.external_game_id = 'hg-parity' and home.external_key = 'HGH';

-- hg-freeze and hg-new each get a single closing-eligible line.
insert into public.game_lines (game_id, source, spread_team_id, spread_value, fetched_at)
select g.id, 'fanduel', home.id, -6, g.commence_time - interval '30 minutes'
from public.games g
cross join public.teams home
where g.external_game_id in ('hg-freeze', 'hg-new') and home.external_key = 'HGH';

-- Picks for parity/divergence: alice locked early (-3), bob locked late (-6).
-- Both in house_group (House) and gamer_group (Gamer).
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  p.group_id,
  tests.get_supabase_uid(p.user_name),
  g.id,
  home.id,
  'L'::public.weight_enum,
  g.commence_time - interval '1 hour',
  home.id,
  p.locked_spread,
  tests.get_supabase_uid(p.user_name)
from (values
  ('00000000-0000-4000-8000-000000000e01'::uuid, 'hg_alice', -3::numeric),
  ('00000000-0000-4000-8000-000000000e01'::uuid, 'hg_bob',   -6::numeric),
  ('00000000-0000-4000-8000-000000000e02'::uuid, 'hg_alice', -3::numeric),
  ('00000000-0000-4000-8000-000000000e02'::uuid, 'hg_bob',   -6::numeric)
) p(group_id, user_name, locked_spread)
cross join public.games g
cross join public.teams home
where g.external_game_id = 'hg-parity' and home.external_key = 'HGH'
on conflict (group_id, user_id, game_id) do nothing;

-- Freeze pick: hg_freeze_user in house_group, locked at -3 (early line).
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000e01',
  tests.get_supabase_uid('hg_freeze_user'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -3,
  tests.get_supabase_uid('hg_freeze_user')
from public.games g cross join public.teams home
where g.external_game_id = 'hg-freeze' and home.external_key = 'HGH'
on conflict (group_id, user_id, game_id) do nothing;

-- New-week pick: hg_new_user in house_group, locked at -6.
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000e01',
  tests.get_supabase_uid('hg_new_user'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -6,
  tests.get_supabase_uid('hg_new_user')
from public.games g cross join public.teams home
where g.external_game_id = 'hg-new' and home.external_key = 'HGH'
on conflict (group_id, user_id, game_id) do nothing;

-- Pre-seed the freeze settlement as graded_preset='gamer' (win, +1 — matches Gamer at -3).
-- The re-grade must leave this settlement byte-identical even though the group is House.
insert into public.pick_settlement (
  group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at, graded_preset
)
select
  '00000000-0000-4000-8000-000000000e01',
  tests.get_supabase_uid('hg_freeze_user'),
  g.id, p.id, 1, 'win'::public.pick_outcome, now(), 'gamer'
from public.games g
join public.picks p
  on p.group_id = '00000000-0000-4000-8000-000000000e01'
 and p.user_id  = tests.get_supabase_uid('hg_freeze_user')
 and p.game_id  = g.id
where g.external_game_id = 'hg-freeze';

-- Tests: House parity + Gamer divergence + capture ----------------------------
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'hg-parity')]
);

-- House parity: alice (locked -3) and bob (locked -6) both graded on closing
-- line -6 → identical loss outcomes. Proves pick-timing luck is eliminated.
select results_eq(
  $$ select outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-parity')
       and user_id  = tests.get_supabase_uid('hg_alice') $$,
  $$ values ('loss') $$,
  'House: alice (locked -3) graded on closing line (-6) → loss'
);

select results_eq(
  $$ select outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-parity')
       and user_id  = tests.get_supabase_uid('hg_bob') $$,
  $$ values ('loss') $$,
  'House: bob (locked -6) graded on closing line (-6) → loss (same as alice)'
);

select results_eq(
  $$ select count(*) from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-parity')
       and graded_preset = 'house'
       and pick_id is not null $$,
  $$ values (2::bigint) $$,
  'House: alice and bob pick settlements both record graded_preset=house'
);

-- Gamer divergence: alice (locked -3) wins but bob (locked -6) loses.
select results_eq(
  $$ select outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e02'
       and game_id  = (select id from public.games where external_game_id = 'hg-parity')
       and user_id  = tests.get_supabase_uid('hg_alice') $$,
  $$ values ('win') $$,
  'Gamer: alice (locked -3, margin +2) → win'
);

select results_eq(
  $$ select outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e02'
       and game_id  = (select id from public.games where external_game_id = 'hg-parity')
       and user_id  = tests.get_supabase_uid('hg_bob') $$,
  $$ values ('loss') $$,
  'Gamer: bob (locked -6, margin -1) → loss (diverges from alice on same pick side)'
);

-- Capture: last pre-kickoff row flagged; post-kickoff row not.
select results_eq(
  $$ select is_closing_line from public.game_lines
     where game_id    = (select id from public.games where external_game_id = 'hg-parity')
       and source     = 'fanduel'
       and spread_value = -6 $$,
  $$ values (true) $$,
  'capture: last pre-kickoff row (spread_value=-6) flagged is_closing_line=true'
);

select results_eq(
  $$ select is_closing_line from public.game_lines
     where game_id    = (select id from public.games where external_game_id = 'hg-parity')
       and source     = 'fanduel'
       and spread_value = -7 $$,
  $$ values (false) $$,
  'capture: post-kickoff row (spread_value=-7) has is_closing_line=false'
);

-- Capture write-once: calling _capture_closing_line again must not add a second flag.
select public._capture_closing_line(
  array[(select id from public.games where external_game_id = 'hg-parity')]
);

select results_eq(
  $$ select count(*) from public.game_lines
     where game_id = (select id from public.games where external_game_id = 'hg-parity')
       and is_closing_line $$,
  $$ values (1::bigint) $$,
  'capture write-once: second call leaves exactly one closing-line row per game'
);

-- Tests: Freeze ---------------------------------------------------------------
-- Grade the freeze game. The pre-seeded settlement has graded_preset='gamer';
-- re-grading must leave it byte-identical (gamer, win, +1) even though the
-- group's live preset is 'house'.
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'hg-freeze')]
);

select results_eq(
  $$ select graded_preset from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-freeze')
       and user_id  = tests.get_supabase_uid('hg_freeze_user') $$,
  $$ values ('gamer') $$,
  'freeze: pre-settled gamer week keeps graded_preset=gamer after re-grade in house group'
);

select results_eq(
  $$ select points_delta from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-freeze')
       and user_id  = tests.get_supabase_uid('hg_freeze_user') $$,
  $$ values (1) $$,
  'freeze: points_delta stays 1 (gamer win at -3) after re-grade against house group'
);

-- Tests: New-week House -------------------------------------------------------
-- No prior settlement → first grade should record graded_preset='house'.
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'hg-new')]
);

select results_eq(
  $$ select graded_preset from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-new')
       and user_id  = tests.get_supabase_uid('hg_new_user') $$,
  $$ values ('house') $$,
  'new-week House: first grade records graded_preset=house'
);

-- Re-grade must not change the frozen preset.
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'hg-new')]
);

select results_eq(
  $$ select graded_preset from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000e01'
       and game_id  = (select id from public.games where external_game_id = 'hg-new')
       and user_id  = tests.get_supabase_uid('hg_new_user') $$,
  $$ values ('house') $$,
  'new-week House: graded_preset=house is stable on re-grade'
);

select * from finish();
rollback;
