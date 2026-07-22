-- 060_competition_start.sql
-- pgTAP for ADR-0037 rulings 4 & 5, the creation/onboarding-UI slice (#725):
--   * create_group's optional p_competition_starts_at (ruling 5): NULL = "start this week,
--     from now"; a future value starts a future week; a past value is clamped up to now() so a
--     brand-new league can never be backdated onto already-played games.
--   * set_competition_start (ruling 4): a commissioner may move the start until the first
--     eligible game kicks off, and never into the past.
--   * competition_start_frozen: the single ruling-4 predicate both the RPC and the UI read.
--
-- The whole file runs in one transaction, so now() (= transaction_timestamp) is constant
-- throughout -- which is why the clamp cases below land exactly on now().

begin;

select plan(15);

-- ── Structural ────────────────────────────────────────────────────────────────
select has_function('public', 'set_competition_start',
  ARRAY['uuid', 'timestamp with time zone'],
  'public.set_competition_start(uuid, timestamptz) exists');
select has_function('public', 'competition_start_frozen', ARRAY['uuid'],
  'public.competition_start_frozen(uuid) exists');

-- Seed ------------------------------------------------------------------------
select tests.create_supabase_user('cs_creator');
select tests.create_supabase_user('cs_commish');
select tests.create_supabase_user('cs_member');

insert into public.users (id, role, display_name, can_create_group) values
  (tests.get_supabase_uid('cs_creator'), 'player', 'CS Creator', true),
  (tests.get_supabase_uid('cs_commish'), 'player', 'CS Commish', false),
  (tests.get_supabase_uid('cs_member'),  'player', 'CS Member',  false)
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name,
      can_create_group = excluded.can_create_group;

-- One league already frozen (a game under its start has kicked off) and one still editable
-- (its start is far in the future, so nothing eligible has kicked off).
insert into public.groups (id, name, competition_starts_at) values
  ('00000000-0000-4000-8000-000000000c41', 'CS Frozen',   '2000-01-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000c42', 'CS Editable', '2999-09-01 00:00:00+00');

-- cs_commish runs both leagues; cs_member is only a plain member of the editable one.
insert into public.group_memberships (group_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000000c41', tests.get_supabase_uid('cs_commish'), 'commissioner', 'active'),
  ('00000000-0000-4000-8000-000000000c42', tests.get_supabase_uid('cs_commish'), 'commissioner', 'active'),
  ('00000000-0000-4000-8000-000000000c42', tests.get_supabase_uid('cs_member'),  'member',       'active');

-- A single already-played game is enough to freeze CS Frozen: its 2020 kickoff is >= that
-- league's 2000 start and <= now(). It is < CS Editable's 2999 start, so it never freezes that one.
insert into public.teams (external_key, name, short_name) values
  ('CSH', 'CS Home', 'CSH'),
  ('CSA', 'CS Away', 'CSA')
on conflict (external_key) do nothing;

insert into public.seasons (id, league, year, grading_locked) values
  (9970, 'NFL', 2020, false)
on conflict (league, year) do nothing;

insert into public.weeks (id, season_id, week_number, start_ts, end_ts, is_scoring) values
  (99701, 9970, 1, '2020-09-10 00:00:00+00', '2020-09-17 00:00:00+00', true);

insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status)
select 99701, 'cs-w1', '2020-09-13 17:00:00+00', home.id, away.id, 'final'
from public.teams home, public.teams away
where home.external_key = 'CSH' and away.external_key = 'CSA';

-- ── create_group start-week argument (ruling 5) ───────────────────────────────
select tests.authenticate_as('cs_creator');

select public.create_group('CS Now');                                   -- NULL -> now()
select public.create_group('CS Future', '2999-09-01 00:00:00+00');      -- future week preserved
select public.create_group('CS Past',   '2000-01-01 00:00:00+00');      -- past clamped to now()

select tests.clear_authentication();
reset role;

select is(
  (select competition_starts_at from public.groups where name = 'CS Now'),
  now(),
  'create_group with no start defaults to now() ("start this week, from now")'
);
select is(
  (select competition_starts_at from public.groups where name = 'CS Future'),
  '2999-09-01 00:00:00+00'::timestamptz,
  'create_group preserves a future-week start'
);
select is(
  (select competition_starts_at from public.groups where name = 'CS Past'),
  now(),
  'create_group clamps a past start up to now() -- a new league can never be backdated'
);

-- ── competition_start_frozen predicate ────────────────────────────────────────
select is(
  public.competition_start_frozen('00000000-0000-4000-8000-000000000c41'),
  true,
  'a league whose first eligible game has kicked off is frozen'
);
select is(
  public.competition_start_frozen('00000000-0000-4000-8000-000000000c42'),
  false,
  'a league with a future start (nothing eligible kicked off) is still editable'
);

-- ── set_competition_start: commissioner happy path ────────────────────────────
select tests.authenticate_as('cs_commish');

select results_eq(
  $$ select public.set_competition_start(
       '00000000-0000-4000-8000-000000000c42', '2999-10-01 00:00:00+00'::timestamptz) $$,
  $$ values ('2999-10-01 00:00:00+00'::timestamptz) $$,
  'a commissioner moves the start of an editable league and gets the stored value back'
);
select is(
  (select competition_starts_at from public.groups
     where id = '00000000-0000-4000-8000-000000000c42'),
  '2999-10-01 00:00:00+00'::timestamptz,
  'the new competition start is persisted on the group'
);

-- ── set_competition_start: guards ─────────────────────────────────────────────
select tests.authenticate_as('cs_member');
select throws_ok(
  $$ select public.set_competition_start(
       '00000000-0000-4000-8000-000000000c42', '2999-11-01 00:00:00+00'::timestamptz) $$,
  'P0020',
  'caller is not a commissioner of this group',
  'a non-commissioner cannot move the competition start (P0020)'
);

select tests.authenticate_as('cs_commish');
select throws_ok(
  $$ select public.set_competition_start(
       '00000000-0000-4000-8000-000000000c41', '2999-11-01 00:00:00+00'::timestamptz) $$,
  'P0031',
  'competition start is frozen: play has already begun',
  'the start cannot move once the first eligible game has kicked off (P0031)'
);

select throws_ok(
  $$ select public.set_competition_start(
       '00000000-0000-4000-8000-000000000c42', '2000-01-01 00:00:00+00'::timestamptz) $$,
  'P0032',
  'competition start cannot be in the past',
  'the start cannot be moved into the past (P0032)'
);

-- NULL means "start this week, from now": resolves to the DB's own now(), never past.
select results_eq(
  $$ select public.set_competition_start('00000000-0000-4000-8000-000000000c42', null) $$,
  $$ values (now()) $$,
  'a null start resolves to now() ("start this week, from now")'
);
select is(
  (select competition_starts_at from public.groups
     where id = '00000000-0000-4000-8000-000000000c42'),
  now(),
  'the null-start path persists now() as the competition start'
);

-- ── anon cannot execute the RPC at all ────────────────────────────────────────
select tests.clear_authentication();
set role anon;
select throws_ok(
  $$ select public.set_competition_start(
       '00000000-0000-4000-8000-000000000c42', '2999-12-01 00:00:00+00'::timestamptz) $$,
  '42501',
  null,
  'anon gets permission denied on set_competition_start'
);
reset role;

select * from finish();
rollback;
