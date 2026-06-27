-- 023_update_group_config.sql
-- pgTAP for update_group_config (issue #154) — commissioner league-rules editing.
--
-- Acceptance criteria verified here:
--   1. update_group_config + group_active_season_settled exist with the right signatures.
--   2. Commissioner can set drop_worst_week on an unsettled group.
--   3. Commissioner can set grading_preset on an unsettled group.
--   4. Non-commissioner is blocked (P0020).
--   5. Changing grading_preset on a group with a settled active-season game is frozen (P0030).
--   6. Re-submitting the SAME grading_preset on that settled group is allowed (no-op).
--   7. drop_worst_week stays freely editable even on a settled group (freeze ignores it).
--   8. A drop_worst_week write preserves other scoring_rules keys (missed_pick_penalty).

begin;

select plan(12);

-- ── Schema sanity checks ──────────────────────────────────────────────────────

select has_function(
  'public', 'update_group_config',
  array['uuid','text','boolean'],
  'update_group_config(uuid, text, boolean) exists'
);
select has_function(
  'public', 'group_active_season_settled',
  array['uuid'],
  'group_active_season_settled(uuid) exists'
);

-- ── Seed fixtures (service role before any auth switch) ───────────────────────

select tests.create_supabase_user('ugc_commissioner');
select tests.create_supabase_user('ugc_member');

insert into public.users (id, role, display_name)
values
  (tests.get_supabase_uid('ugc_commissioner'), 'player', 'UGC Commissioner'),
  (tests.get_supabase_uid('ugc_member'),       'player', 'UGC Member')
on conflict (id) do update
  set role = excluded.role, display_name = excluded.display_name;

-- Two groups:
--   Group A: fresh / unsettled  (tests drop_worst_week + grading_preset writes)
--   Group B: has a settled active-season game (tests the P0030 freeze)
insert into public.groups (id, name)
values
  ('00000000-0000-4154-8000-000000000001', 'UGC Group A'),
  ('00000000-0000-4154-8000-000000000002', 'UGC Group B');

insert into public.group_memberships (group_id, user_id, role)
values
  ('00000000-0000-4154-8000-000000000001', tests.get_supabase_uid('ugc_commissioner'), 'commissioner'),
  ('00000000-0000-4154-8000-000000000001', tests.get_supabase_uid('ugc_member'),       'member'),
  ('00000000-0000-4154-8000-000000000002', tests.get_supabase_uid('ugc_commissioner'), 'commissioner');

-- group_config rows; Group A seeds a missed_pick_penalty key to prove the jsonb
-- merge preserves it across a drop_worst_week update.
insert into public.group_config (group_id, line_source, scoring_rules, grading_preset)
values
  ('00000000-0000-4154-8000-000000000001', 'fanduel', '{"missed_pick_penalty": -2}', 'house'),
  ('00000000-0000-4154-8000-000000000002', 'fanduel', '{}', 'house');

-- Settled active-season game for Group B. Active season = max(seasons.year).
-- Derive a year strictly above the current max so this season is the active one
-- for the freeze check. coalesce handles a migration-only DB (CI) with no seasons.
insert into public.seasons (id, league, year)
values (9954, 'NFL', (select coalesce(max(year), 2000) + 1 from public.seasons));

insert into public.weeks (id, season_id, week_number, start_ts, end_ts)
values (99541, 9954, 1, '2054-09-04 00:00:00+00', '2054-09-11 00:00:00+00');

insert into public.teams (external_key, name, short_name)
values ('UGCH', 'UGC Home', 'UGCH'), ('UGCA', 'UGC Away', 'UGCA')
on conflict (external_key) do nothing;

insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status, final_scores)
select 99541, 'ugc-settled', '2054-09-07 17:00:00+00', home.id, away.id, 'final', '{"home": 14, "away": 9}'::jsonb
from public.teams home cross join public.teams away
where home.external_key = 'UGCH' and away.external_key = 'UGCA'
on conflict (external_game_id) do nothing;

-- A settled pick row for Group B in the active season (no pick_id needed for the
-- freeze check — group_active_season_settled only counts pick_settlement rows).
insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at, graded_preset)
select
  '00000000-0000-4154-8000-000000000002',
  tests.get_supabase_uid('ugc_commissioner'),
  g.id, null, 1, 'win'::public.pick_outcome, now(), 'house'
from public.games g
where g.external_game_id = 'ugc-settled';

-- ── 2. Commissioner sets drop_worst_week on the unsettled group ───────────────

select tests.authenticate_as('ugc_commissioner');

select lives_ok(
  $$ select public.update_group_config('00000000-0000-4154-8000-000000000001', null, true) $$,
  'commissioner can set drop_worst_week on an unsettled group'
);

select results_eq(
  $$ select (scoring_rules->>'drop_worst_week')::boolean
     from public.group_config where group_id = '00000000-0000-4154-8000-000000000001' $$,
  $$ values (true) $$,
  'drop_worst_week was written'
);

-- ── 8. missed_pick_penalty key preserved by the jsonb merge ──────────────────

select results_eq(
  $$ select (scoring_rules->>'missed_pick_penalty')::int
     from public.group_config where group_id = '00000000-0000-4154-8000-000000000001' $$,
  $$ values (-2) $$,
  'missed_pick_penalty key preserved after drop_worst_week update'
);

-- ── 3. Commissioner sets grading_preset on the unsettled group ────────────────

select lives_ok(
  $$ select public.update_group_config('00000000-0000-4154-8000-000000000001', 'gamer', false) $$,
  'commissioner can set grading_preset on an unsettled group'
);

select results_eq(
  $$ select grading_preset
     from public.group_config where group_id = '00000000-0000-4154-8000-000000000001' $$,
  $$ values ('gamer') $$,
  'grading_preset was written'
);

-- ── 4. Non-commissioner is blocked ────────────────────────────────────────────

select tests.authenticate_as('ugc_member');

select throws_ok(
  $$ select public.update_group_config('00000000-0000-4154-8000-000000000001', 'house', false) $$,
  'P0020', null,
  'non-commissioner is blocked (P0020)'
);

-- ── 5. grading_preset change on a settled group is frozen (P0030) ─────────────

select tests.authenticate_as('ugc_commissioner');

select throws_ok(
  $$ select public.update_group_config('00000000-0000-4154-8000-000000000002', 'gamer', null) $$,
  'P0030', null,
  'grading_preset change on a settled active-season group is frozen (P0030)'
);

-- ── 6. Re-submitting the SAME grading_preset on the settled group is allowed ──

select lives_ok(
  $$ select public.update_group_config('00000000-0000-4154-8000-000000000002', 'house', null) $$,
  're-submitting the same grading_preset on a settled group is a no-op (allowed)'
);

-- ── 7. drop_worst_week stays editable on the settled group ────────────────────

select lives_ok(
  $$ select public.update_group_config('00000000-0000-4154-8000-000000000002', 'house', true) $$,
  'drop_worst_week is freely editable on a settled group (freeze ignores it)'
);

select results_eq(
  $$ select (scoring_rules->>'drop_worst_week')::boolean
     from public.group_config where group_id = '00000000-0000-4154-8000-000000000002' $$,
  $$ values (true) $$,
  'drop_worst_week written on the settled group'
);

select * from finish();
rollback;
