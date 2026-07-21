-- 059_participation_read_surfaces.sql
-- pgTAP for ADR-0037 / #724: the READ surfaces that enumerate membership x games themselves.
--
-- 058 covers the write side (the grading choke point never creates a pre-participation row).
-- Surfaces that read pick_settlement inherit that correctness for free. These do not:
--
--   (1) find_unsettled_weeks() / advance_week_if_complete() -- the completeness pair. Their
--       predicate is "final game with ZERO pick_settlement rows", which silently assumed
--       grading always owes at least one row per game. Under the boundary a game can owe
--       NOTHING (played before any league was competing), so the predicate flagged it as
--       unsettled forever: the reconcile sweep re-fired on every tick against a week it could
--       never heal, and the week could never report complete. public._settlement_owed() is the
--       guard, and it calls the same public._participation_start() grading does.
--
--   (2) picks_status_board() -- the who's-picked board cross-joins the active roster to the
--       week's still-open games, so a league whose competition starts next week read as
--       0/13 behind on this week. Its slate is now per member.
--
-- Determinism note: _settlement_owed is deliberately GLOBAL (both callers are cross-league and
-- only ask whether the GAME is stranded). So "no league was competing yet" is a statement about
-- every group in the database, and this file first parks every pre-existing group's competition
-- start beyond any fixture game. Transaction-local and rolled back, like the rest of the file.

begin;

select plan(9);

-- ── Park pre-existing leagues so the global eligibility question is decidable ──
update public.groups set competition_starts_at = '2099-01-01 00:00:00+00';

-- Seed -------------------------------------------------------------------------
select tests.create_supabase_user('rs_early');
select tests.create_supabase_user('rs_late');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('rs_early'), 'player', 'RS Early'),
  (tests.get_supabase_uid('rs_late'),  'player', 'RS Late')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

-- "RS Early" has been competing since 2020. "RS Late" starts three days from now, so it is
-- mid-signup: this week's slate is partly before its competition begins.
insert into public.groups (id, name, competition_starts_at) values
  ('00000000-0000-4000-8000-000000000f41', 'RS Early', '2020-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f42', 'RS Late',  now() + interval '3 days');

insert into public.group_memberships (group_id, user_id, role, status, joined_at) values
  ('00000000-0000-4000-8000-000000000f41', tests.get_supabase_uid('rs_early'),
   'commissioner', 'active', '2020-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000f42', tests.get_supabase_uid('rs_late'),
   'commissioner', 'active', '2020-01-01 00:00:00+00');

insert into public.teams (external_key, name, short_name) values
  ('RSA', 'RS Team A', 'RSA'), ('RSB', 'RS Team B', 'RSB'),
  ('RSC', 'RS Team C', 'RSC'), ('RSD', 'RS Team D', 'RSD'),
  ('RSE', 'RS Team E', 'RSE'), ('RSF', 'RS Team F', 'RSF')
on conflict (external_key) do nothing;

-- 1997 predates every league above; 2062 postdates them. Both unlocked, so ADR-0024's frozen
-- -season exclusion cannot be what produces the results below.
insert into public.seasons (id, league, year, grading_locked) values
  (9962, 'NFL', 1997, false),
  (9963, 'NFL', 2062, false),
  (9964, 'NFL', 2063, false);

insert into public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) values
  (99611, 9962, 1, '1997-09-01 00:00:00+00', '1997-09-08 00:00:00+00', true),
  (99613, 9962, 2, '1997-09-08 00:00:00+00', '1997-09-15 00:00:00+00', true),
  (99621, 9963, 1, '2062-09-01 00:00:00+00', '2062-09-08 00:00:00+00', true),
  (99631, 9964, 1, now() - interval '1 day', now() + interval '7 days', true);

-- Final games. rs-stranded + rs-picked predate every league; rs-owed does not.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select g.week_id, g.ext, g.commence, home.id, away.id, 'final', '{"home": 20, "away": 10}'::jsonb
from (values
  (99611, 'rs-stranded', '1997-09-07 17:00:00+00'::timestamptz, 'RSA', 'RSB'),
  (99613, 'rs-picked',   '1997-09-14 17:00:00+00'::timestamptz, 'RSA', 'RSB'),
  (99621, 'rs-owed',     '2062-09-07 17:00:00+00'::timestamptz, 'RSA', 'RSB')
) g(week_id, ext, commence, home_key, away_key)
join public.teams home on home.external_key = g.home_key
join public.teams away on away.external_key = g.away_key;

-- The board's week: three still-open games straddling RS Late's competition start (+3 days).
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status)
select 99631, g.ext, g.commence, home.id, away.id, 'scheduled'
from (values
  ('rs-open-1', now() + interval '1 day',  'RSA', 'RSB'),
  ('rs-open-2', now() + interval '5 days', 'RSC', 'RSD'),
  ('rs-open-3', now() + interval '6 days', 'RSE', 'RSF')
) g(ext, commence, home_key, away_key)
join public.teams home on home.external_key = g.home_key
join public.teams away on away.external_key = g.away_key;

-- A real pick on a pre-participation game. Pass (1) of _grade_games_by_ids grades real picks
-- with no boundary gate (ADR-0037 ruling 2), so this game IS still owed a row and the sweep
-- must keep seeing it.
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f41',
  tests.get_supabase_uid('rs_early'),
  g.id, home.id, 'M'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -3.5,
  tests.get_supabase_uid('rs_early')
from public.games g
join public.teams home on home.external_key = 'RSA'
where g.external_game_id = 'rs-picked';

-- ── _settlement_owed: does grading owe this game anything? ─────────────────────
select is(
  public._settlement_owed((select id from public.games where external_game_id = 'rs-stranded')),
  false,
  'a game played before every league was competing owes no settlement row'
);

select is(
  public._settlement_owed((select id from public.games where external_game_id = 'rs-owed')),
  true,
  'a game inside a league''s participation still owes a row'
);

select is(
  public._settlement_owed((select id from public.games where external_game_id = 'rs-picked')),
  true,
  'a pre-participation game with a REAL pick is still owed (the real-pick pass has no gate)'
);

-- ── find_unsettled_weeks: the reconcile sweep must converge ────────────────────
-- Scoped by week id so unrelated fixture/seed data cannot leak into the assertion.
select is_empty(
  $$ select f.id from public.find_unsettled_weeks() f where f.id = 99611 $$,
  'the sweep does not flag a week whose final game nobody was participating in (it can never heal)'
);

select results_eq(
  $$ select f.id from public.find_unsettled_weeks() f where f.id in (99613, 99621) order by f.id $$,
  $$ values (99613), (99621) $$,
  'a genuinely stranded week -- owed a row, and unsettled -- is still surfaced'
);

-- ── picks_status_board: the slate is per member ────────────────────────────────
select tests.authenticate_as('rs_late');

select results_eq(
  $$ select picks_made, games_available, is_complete
     from public.picks_status_board('00000000-0000-4000-8000-000000000f42'::uuid, 99631)
     where user_id = tests.get_supabase_uid('rs_late') $$,
  $$ values (0::integer, 2::integer, false) $$,
  'the board omits the open game that starts before the league''s competition does (2 of 3)'
);

select tests.authenticate_as('rs_early');

select results_eq(
  $$ select picks_made, games_available, is_complete
     from public.picks_status_board('00000000-0000-4000-8000-000000000f41'::uuid, 99631)
     where user_id = tests.get_supabase_uid('rs_early') $$,
  $$ values (0::integer, 3::integer, false) $$,
  'a league already competing still owes the whole open slate (3 of 3) -- the boundary only subtracts'
);

-- ── The fixture genuinely exercises the defect ────────────────────────────────
-- Both assertions below run the PRE-FIX predicate inline. Without them, a future change that
-- made this fixture stop reproducing the bug (e.g. a seed group with an early competition
-- start leaking in, which would make rs-stranded owed after all) would leave assertions 4 and
-- 6 passing vacuously, and this whole file would silently guard nothing.

select results_eq(
  $$ select distinct w.id
     from public.weeks w
     join public.seasons s on s.id = w.season_id
     join public.games g on g.week_id = w.id
     where w.id = 99611
       and not s.grading_locked
       and (g.final_scores->>'home') is not null
       and not exists (select 1 from public.pick_settlement ps where ps.game_id = g.id) $$,
  $$ values (99611) $$,
  'anchor: without _settlement_owed the sweep DOES flag the stranded week -- the fixture bites'
);

select results_eq(
  $$ select count(*)::integer
     from public.games g
     where g.week_id = 99631 and now() < g.commence_time $$,
  $$ values (3::integer) $$,
  'anchor: the un-scoped board slate is 3, so RS Late''s 2 is the boundary at work'
);

select * from finish();
rollback;
