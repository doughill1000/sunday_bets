-- 045_reconcile_grade_sweep.sql
-- pgTAP for the grade-cron reconcile sweep (#433). The cron normally only processes the
-- active + most-recently-concluded week, so a week missed during that window is stranded
-- forever. find_unsettled_weeks() is the self-heal predicate; grading the weeks it returns
-- settles them. This mirrors the cron's sweep loop at the SQL level.
--
-- Guarantees:
--   1. find_unsettled_weeks() returns a stranded week (finals present, no settlement).
--   2. It does NOT return an already-settled week (a settlement row exists for its game).
--   3. It does NOT return a frozen (grading_locked, ADR-0024) season's week, even unsettled.
--   4/5. Running the sweep (grade every returned week) settles the stranded week's real
--        pick + membership-scoped missed penalty.
--   6. The sweep leaves the already-settled week's pre-existing settlement byte-identical
--        (it is never in the returned set, so it is never re-graded).
--   7. The frozen week stays unsettled — locked seasons are inert to the sweep.
--   8. Once healed, find_unsettled_weeks() no longer returns the stranded week (true no-op).

begin;

select plan(8);

-- Seed: one group, a picker + a non-picker (both active members) ----------------
select tests.create_supabase_user('rgs_picker');
select tests.create_supabase_user('rgs_skipper');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('rgs_picker'),  'player', 'RGS Picker'),
  (tests.get_supabase_uid('rgs_skipper'), 'player', 'RGS Skipper')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000e01', 'RGS Group');

insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('rgs_picker'),  'member', 'active'),
  ('00000000-0000-4000-8000-000000000e01', tests.get_supabase_uid('rgs_skipper'), 'member', 'active');

insert into public.teams (external_key, name, short_name) values
  ('RGSH', 'RGS Home', 'RGSH'),
  ('RGSA', 'RGS Away', 'RGSA')
on conflict (external_key) do nothing;

-- Live (unlocked) season 2054 + frozen (locked) season 2018.
insert into public.seasons (id, league, year, grading_locked) values
  (9954, 'NFL', 2054, false),
  (9955, 'NFL', 2018, true)
on conflict (league, year) do nothing;

-- Week A = stranded (finals, no settlement); Week B = already settled; Week C = frozen.
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99541, 9954, 1, '2054-09-04 00:00:00+00', '2054-09-11 00:00:00+00'),
  (99542, 9954, 2, '2054-09-11 00:00:00+00', '2054-09-18 00:00:00+00'),
  (99551, 9955, 1, '2018-09-06 00:00:00+00', '2018-09-13 00:00:00+00');

-- One final game per week. home 20 / away 10, picked home at -6 -> margin +4 -> win (+1 at 'L').
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select g.week_id, g.ext, g.commence, home.id, away.id, 'final', '{"home": 20, "away": 10}'::jsonb
from (values
  (99541, 'rgs-stranded', '2054-09-07 17:00:00+00'::timestamptz),
  (99542, 'rgs-settled',  '2054-09-14 17:00:00+00'::timestamptz),
  (99551, 'rgs-frozen',   '2018-09-09 17:00:00+00'::timestamptz)
) g(week_id, ext, commence)
cross join public.teams home
cross join public.teams away
where home.external_key = 'RGSH' and away.external_key = 'RGSA'
on conflict (external_game_id) do nothing;

-- Picker picks home in every game.
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000e01',
  tests.get_supabase_uid('rgs_picker'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -6,
  tests.get_supabase_uid('rgs_picker')
from public.games g
cross join public.teams home
where g.external_game_id in ('rgs-stranded', 'rgs-settled', 'rgs-frozen')
  and home.external_key = 'RGSH'
on conflict (group_id, user_id, game_id) do nothing;

-- Pre-existing settlement ONLY on week B's game, with deliberately-wrong values and a
-- fixed graded_at so a stray re-grade (which would recompute to +1 / now()) is detectable.
insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at, graded_preset)
select
  '00000000-0000-4000-8000-000000000e01',
  tests.get_supabase_uid('rgs_picker'),
  g.id, p.id, 9, 'win'::public.pick_outcome, '2000-01-01 00:00:00+00', 'gamer'
from public.games g
join public.picks p
  on p.group_id = '00000000-0000-4000-8000-000000000e01'
 and p.user_id  = tests.get_supabase_uid('rgs_picker')
 and p.game_id  = g.id
where g.external_game_id = 'rgs-settled';

-- ── 1/2/3. The predicate, before any sweep ───────────────────────────────────
select ok(
  exists (select 1 from public.find_unsettled_weeks() where id = 99541),
  '(1) find_unsettled_weeks returns the stranded week (finals, no settlement)'
);

select ok(
  not exists (select 1 from public.find_unsettled_weeks() where id = 99542),
  '(2) find_unsettled_weeks does NOT return an already-settled week'
);

select ok(
  not exists (select 1 from public.find_unsettled_weeks() where id = 99551),
  '(3) find_unsettled_weeks does NOT return a frozen (grading_locked) season week'
);

-- ── Run the sweep: grade exactly the weeks the predicate returns ──────────────
do $$
declare r record;
begin
  for r in select id from public.find_unsettled_weeks() loop
    perform public.grade_week(r.id);
  end loop;
end $$;

-- ── 4/5. The stranded week is now settled ────────────────────────────────────
select results_eq(
  $$ select outcome::text, points_delta from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'rgs-stranded')
       and user_id = tests.get_supabase_uid('rgs_picker') $$,
  $$ values ('win', 1) $$,
  '(4) sweep settles the stranded week''s real pick (home covers -6 -> +1)'
);

select results_eq(
  $$ select outcome::text, points_delta from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'rgs-stranded')
       and user_id = tests.get_supabase_uid('rgs_skipper') $$,
  $$ values ('missed', -1) $$,
  '(5) sweep applies the membership-scoped missed penalty to the non-picker'
);

-- ── 6. The already-settled week is untouched (never in the returned set) ──────
select results_eq(
  $$ select points_delta, outcome::text, graded_at from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'rgs-settled')
       and user_id = tests.get_supabase_uid('rgs_picker') $$,
  $$ values (9, 'win', '2000-01-01 00:00:00+00'::timestamptz) $$,
  '(6) sweep leaves the already-settled week''s pick_settlement byte-identical'
);

-- ── 7. The frozen week stays unsettled (locked seasons are inert) ─────────────
select is_empty(
  $$ select 1 from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'rgs-frozen') $$,
  '(7) frozen-season week is never settled by the sweep'
);

-- ── 8. Healed: the stranded week is no longer returned (true no-op) ───────────
select ok(
  not exists (select 1 from public.find_unsettled_weeks() where id = 99541),
  '(8) once healed, find_unsettled_weeks no longer returns the stranded week'
);

select * from finish();
rollback;
