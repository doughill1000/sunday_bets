-- 043_grading_membership_and_frozen_seasons.sql
-- pgTAP for ADR-0024 (issue #447). Two grading-integrity guarantees:
--   (A) the missed-pick penalty is scoped to ACTIVE league membership, not global
--       users.role -- a competing app-admin is penalized like any other member, and
--       'pending' invitees are not penalized.
--   (B) seasons.grading_locked freezes imported seasons: _grade_games_by_ids (the single
--       choke point) is a no-op on a locked season and never mutates its settlements.

begin;

select plan(8);

-- Structural ------------------------------------------------------------------
select has_column('public', 'seasons', 'grading_locked', 'seasons has grading_locked');

-- Seed: one admin + two players + one pending invitee, all in one group ---------
select tests.create_supabase_user('gmf_admin');
select tests.create_supabase_user('gmf_player');
select tests.create_supabase_user('gmf_pending');
select tests.create_supabase_user('gmf_picker');

insert into public.users (id, role, display_name) values
  (tests.get_supabase_uid('gmf_admin'),   'admin',  'GMF Admin'),
  (tests.get_supabase_uid('gmf_player'),  'player', 'GMF Player'),
  (tests.get_supabase_uid('gmf_pending'), 'player', 'GMF Pending'),
  (tests.get_supabase_uid('gmf_picker'),  'player', 'GMF Picker')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

insert into public.groups (id, name) values
  ('00000000-0000-4000-8000-000000000f01', 'GMF Group');

-- admin/player/picker are ACTIVE members; pending is a not-yet-accepted invite.
insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000f01', tests.get_supabase_uid('gmf_admin'),   'member', 'active'),
  ('00000000-0000-4000-8000-000000000f01', tests.get_supabase_uid('gmf_player'),  'member', 'active'),
  ('00000000-0000-4000-8000-000000000f01', tests.get_supabase_uid('gmf_picker'),  'member', 'active'),
  ('00000000-0000-4000-8000-000000000f01', tests.get_supabase_uid('gmf_pending'), 'member', 'pending');

insert into public.teams (external_key, name, short_name) values
  ('GMFH', 'GMF Home', 'GMFH'),
  ('GMFA', 'GMF Away', 'GMFA')
on conflict (external_key) do nothing;

-- Live (unlocked) season 2052 and a frozen (locked) season 2019.
insert into public.seasons (id, league, year, grading_locked) values
  (9952, 'NFL', 2052, false),
  (9953, 'NFL', 2019, true)
on conflict (league, year) do nothing;

-- Two locked-season weeks so the two locked games are distinct matchups
-- (uq_games_matchup is per week + team pair).
insert into public.weeks (id, season_id, week_number, start_ts, end_ts) values
  (99521, 9952, 1, '2052-09-04 00:00:00+00', '2052-09-11 00:00:00+00'),
  (99531, 9953, 1, '2019-09-05 00:00:00+00', '2019-09-12 00:00:00+00'),
  (99532, 9953, 2, '2019-09-12 00:00:00+00', '2019-09-19 00:00:00+00');

-- One game per season, both final. Gamer preset (no group_config) grades real picks
-- off the pick's locked spread, so no game_lines are needed.
insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select g.week_id, g.ext, g.commence, home.id, away.id, 'final', '{"home": 20, "away": 10}'::jsonb
from (values
  (99521, 'gmf-live',          '2052-09-07 17:00:00+00'::timestamptz),
  (99531, 'gmf-locked-empty',  '2019-09-08 17:00:00+00'::timestamptz),
  (99532, 'gmf-locked-frozen', '2019-09-15 17:00:00+00'::timestamptz)
) g(week_id, ext, commence)
cross join public.teams home
cross join public.teams away
where home.external_key = 'GMFH' and away.external_key = 'GMFA'
on conflict (external_game_id) do nothing;

-- picker picks home in all three games (home covers -6: margin (20-10)-6 = +4 → win).
insert into public.picks (
  group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_spread_team_id, locked_spread_value, locked_by
)
select
  '00000000-0000-4000-8000-000000000f01',
  tests.get_supabase_uid('gmf_picker'),
  g.id, home.id, 'L'::public.weight_enum,
  g.commence_time - interval '1 hour', home.id, -6,
  tests.get_supabase_uid('gmf_picker')
from public.games g
cross join public.teams home
where g.external_game_id in ('gmf-live', 'gmf-locked-empty', 'gmf-locked-frozen')
  and home.external_key = 'GMFH'
on conflict (group_id, user_id, game_id) do nothing;

-- Pre-existing frozen settlement in the LOCKED season: picker, +7 win, must survive a
-- grade run byte-identical (a re-grade would otherwise recompute it to +1 at -6).
insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at, graded_preset)
select
  '00000000-0000-4000-8000-000000000f01',
  tests.get_supabase_uid('gmf_picker'),
  g.id, p.id, 7, 'win'::public.pick_outcome, now(), 'gamer'
from public.games g
join public.picks p
  on p.group_id = '00000000-0000-4000-8000-000000000f01'
 and p.user_id  = tests.get_supabase_uid('gmf_picker')
 and p.game_id  = g.id
where g.external_game_id = 'gmf-locked-frozen';

-- ── (A) Live season: missed penalty is membership-scoped ─────────────────────
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'gmf-live')]
);

select results_eq(
  $$ select outcome::text, points_delta from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-live')
       and user_id = tests.get_supabase_uid('gmf_admin') $$,
  $$ values ('missed', -1) $$,
  '(A) admin member who skipped a game gets a missed -1 (no role-based exemption)'
);

select results_eq(
  $$ select outcome::text, points_delta from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-live')
       and user_id = tests.get_supabase_uid('gmf_player') $$,
  $$ values ('missed', -1) $$,
  '(A) ordinary player who skipped a game gets a missed -1 (unchanged)'
);

select is_empty(
  $$ select 1 from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-live')
       and user_id = tests.get_supabase_uid('gmf_pending') $$,
  '(A) pending invitee is NOT penalized (status <> active)'
);

select results_eq(
  $$ select count(*) from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-live')
       and group_id = '00000000-0000-4000-8000-000000000f01'
       and outcome = 'missed' $$,
  $$ values (2::bigint) $$,
  '(A) exactly two missed rows in the test group (admin + player); pending excluded'
);

select results_eq(
  $$ select outcome::text from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-live')
       and user_id = tests.get_supabase_uid('gmf_picker') $$,
  $$ values ('win') $$,
  '(A) real pick still grades normally alongside the missed pass'
);

-- ── (B) Locked season: grading is a no-op and never mutates settlements ───────
select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'gmf-locked-empty')]
);

select is_empty(
  $$ select 1 from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-locked-empty') $$,
  '(B) grading a locked season creates no settlements (real or missed)'
);

select public._grade_games_by_ids(
  array[(select id from public.games where external_game_id = 'gmf-locked-frozen')]
);

select results_eq(
  $$ select outcome::text, points_delta from public.pick_settlement
     where game_id = (select id from public.games where external_game_id = 'gmf-locked-frozen')
       and user_id = tests.get_supabase_uid('gmf_picker') $$,
  $$ values ('win', 7) $$,
  '(B) a pre-existing settlement in a locked season is unchanged by a grade run'
);

select * from finish();
rollback;
