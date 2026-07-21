-- 057_grading_preset_cohort_freeze.sql
-- pgTAP for the ADR-0007 2026-07-15 amendment (issue #657): the grading preset must
-- freeze per GAME COHORT, not per row. A row born late into an already-graded game
-- (a new active member, or a backfilled gap) must adopt the preset its game's existing
-- rows were already frozen under, not whatever group_config.grading_preset says today.

begin;

select plan(9);

-- Seed: one group, config starts 'gamer' -------------------------------------
select tests.create_supabase_user('cf_first');
select tests.create_supabase_user('cf_late_pick');
select tests.create_supabase_user('cf_late_missed');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('cf_first'),       'player', 'CF First'),
  (tests.get_supabase_uid('cf_late_pick'),   'player', 'CF Late Pick'),
  (tests.get_supabase_uid('cf_late_missed'), 'player', 'CF Late Missed')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000f11', 'CF Cohort Group');

insert into public.group_config (group_id, line_source, scoring_rules, grading_preset) values
  ('00000000-0000-4000-8000-000000000f11', 'fanduel', '{}', 'gamer');

-- Only cf_first is a member at first grade; the other two join later.
insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000f11', tests.get_supabase_uid('cf_first'), 'member', 'active');

insert into public.seasons (id, league, year)
values (9954, 'NFL', 2054)
on conflict (league, year) do nothing;

-- Two weeks so the isolation game (cf-cohort-2) is a distinct matchup
-- (uq_games_matchup is per week + team pair, and both games reuse CFH/CFA).
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99541, 9954, 1, '2054-09-04 00:00:00+00', '2054-09-11 00:00:00+00'),
  (99542, 9954, 2, '2054-09-11 00:00:00+00', '2054-09-18 00:00:00+00');

insert into public.teams (external_key, name, short_name) values
  ('CFH', 'CF Home', 'CFH'),
  ('CFA', 'CF Away', 'CFA')
on conflict (external_key) do nothing;

-- home=14 away=9, margin=5. Gamer at 3 (locked) -> +2 -> win.
-- House at 6 (closing)   -> -1 -> loss. The two presets must diverge on this game
-- so a wrongly-resolved preset is visible in the outcome, not just the label.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select g.week_id, g.ext, g.commence, home.id, away.id, 'final', '{"home": 14, "away": 9}'::jsonb
from (values
  (99541, 'cf-cohort', '2054-09-07 17:00:00+00'::timestamptz)
) g(week_id, ext, commence)
cross join public.teams home
cross join public.teams away
where home.external_key = 'CFH' and away.external_key = 'CFA'
on conflict (external_game_id) do nothing;

-- Closing line: 6 (captured by _capture_closing_line during the first grade).
insert into public.game_lines (game_id, source, spread_team_id, spread_value, fetched_at)
select g.id, 'fanduel', home.id, 6, g.commence_time - interval '30 minutes'
from public.games g
cross join public.teams home
where g.external_game_id = 'cf-cohort' and home.external_key = 'CFH';

-- cf_first locks at 3, picks home.
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f11',
  tests.get_supabase_uid('cf_first'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, 3,
  tests.get_supabase_uid('cf_first')
from public.games g cross join public.teams home
where g.external_game_id = 'cf-cohort' and home.external_key = 'CFH'
on conflict (group_id, user_id, game_id) do nothing;

-- First grade: config is 'gamer', no prior settlement exists anywhere for this game
-- -> cf_first's row freezes graded_preset='gamer' by falling through to group_config.
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'cf-cohort')]
);

select results_eq(
  $$ select graded_preset, outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort')
       and user_id  = tests.get_supabase_uid('cf_first') $$,
  $$ values ('gamer', 'win') $$,
  'cf_first freezes graded_preset=gamer (locked 3, margin +2) on first grade'
);

-- Config now flips to 'house' -- simulating the commissioner changing it after the
-- game was already graded, exactly as in the reproduction and the prod incident.
update public.group_config set grading_preset = 'house'
where group_id = '00000000-0000-4000-8000-000000000f11';

-- Two new active members join the group AFTER the config flip, into the SAME
-- already-graded game. cf_late_pick locks at 3 (matches cf_first); cf_late_missed
-- never picks.
insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000f11', tests.get_supabase_uid('cf_late_pick'),   'member', 'active'),
  ('00000000-0000-4000-8000-000000000f11', tests.get_supabase_uid('cf_late_missed'), 'member', 'active');

insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f11',
  tests.get_supabase_uid('cf_late_pick'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, 3,
  tests.get_supabase_uid('cf_late_pick')
from public.games g cross join public.teams home
where g.external_game_id = 'cf-cohort' and home.external_key = 'CFH'
on conflict (group_id, user_id, game_id) do nothing;

-- Re-grade the same game. This is the reproduction: a late-born row must resolve
-- its preset from the game's existing cohort, not today's (now 'house') config.
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'cf-cohort')]
);

select results_eq(
  $$ select graded_preset, outcome::text, points_delta from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort')
       and user_id  = tests.get_supabase_uid('cf_late_pick') $$,
  $$ values ('gamer', 'win', 1) $$,
  'cf_late_pick (born after config flipped to house) adopts cohort preset gamer, not house'
);

select results_eq(
  $$ select graded_preset, outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort')
       and user_id  = tests.get_supabase_uid('cf_late_missed') $$,
  $$ values ('gamer', 'missed') $$,
  'cf_late_missed (missed-penalty pass) also adopts cohort preset gamer, not house'
);

-- ps_prior freeze still wins: cf_first''s own row is untouched by the re-grade.
select results_eq(
  $$ select graded_preset, outcome::text, points_delta from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort')
       and user_id  = tests.get_supabase_uid('cf_first') $$,
  $$ values ('gamer', 'win', 1) $$,
  'cf_first''s own frozen row is unchanged by the re-grade (ps_prior still wins)'
);

-- No game in the test group ever mixes presets (the acceptance-criteria invariant).
select results_eq(
  $$ select count(distinct graded_preset) from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort') $$,
  $$ values (1::bigint) $$,
  'cf-cohort game never mixes presets across its settlement rows'
);

-- Isolation: a second, never-graded game in the SAME (now house) group must NOT pick
-- up 'gamer' from the other game's cohort -- ps_cohort is scoped by game_id too.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select 99542, 'cf-cohort-2', '2054-09-15 17:00:00+00'::timestamptz, home.id, away.id, 'final', '{"home": 14, "away": 9}'::jsonb
from public.teams home cross join public.teams away
where home.external_key = 'CFH' and away.external_key = 'CFA'
on conflict (external_game_id) do nothing;

-- Closing line 6, same shape as cf-cohort. This game grades House, and House has no
-- pick-time fallback (#735) -- it grades on the closing line or raises. Before #735 this
-- fixture had no game_lines row at all and the old coalesce quietly settled it at the
-- locked 3, so the test asserted the right preset label on a line House should never
-- have used. Every gradable game reaches here with a pre-kickoff row in reality: that is
-- what a locked pick is snapshotted from.
insert into public.game_lines (game_id, source, spread_team_id, spread_value, fetched_at)
select g.id, 'fanduel', home.id, 6, g.commence_time - interval '30 minutes'
from public.games g
cross join public.teams home
where g.external_game_id = 'cf-cohort-2' and home.external_key = 'CFH';

insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f11',
  tests.get_supabase_uid('cf_first'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, 3,
  tests.get_supabase_uid('cf_first')
from public.games g cross join public.teams home
where g.external_game_id = 'cf-cohort-2' and home.external_key = 'CFH'
on conflict (group_id, user_id, game_id) do nothing;

select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'cf-cohort-2')]
);

-- Outcome is asserted alongside the preset so this proves House graded on the CLOSING
-- line, not just that it wrote the label: closing 6 gives margin 5-6 = -1 -> loss,
-- whereas the locked 3 would have given +2 -> win.
select results_eq(
  $$ select graded_preset, outcome::text from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort-2')
       and user_id  = tests.get_supabase_uid('cf_first') $$,
  $$ values ('house', 'loss') $$,
  'isolation: an unrelated game in the same group grades house on its closing line (cohort is empty)'
);

-- Sanity: re-grading cf-cohort-2 a second time is stable (ps_prior now exists).
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'cf-cohort-2')]
);

select results_eq(
  $$ select graded_preset from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort-2')
       and user_id  = tests.get_supabase_uid('cf_first') $$,
  $$ values ('house') $$,
  'isolation: cf-cohort-2 stays house on re-grade'
);

-- Exactly one missed-pass row for cf_late_missed (no duplicate insert on re-grade).
select results_eq(
  $$ select count(*) from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort')
       and user_id  = tests.get_supabase_uid('cf_late_missed') $$,
  $$ values (1::bigint) $$,
  'cf_late_missed has exactly one settlement row'
);

select results_eq(
  $$ select count(*) from public.pick_settlement
     where group_id = '00000000-0000-4000-8000-000000000f11'
       and game_id  = (select id from public.games where external_game_id = 'cf-cohort') $$,
  $$ values (3::bigint) $$,
  'cf-cohort game has exactly three settlement rows (first, late pick, late missed)'
);

select * from finish();
rollback;
