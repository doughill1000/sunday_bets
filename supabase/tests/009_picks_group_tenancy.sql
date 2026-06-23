-- 009_picks_group_tenancy.sql
-- pgTAP tests for group-scoped picks and pick_settlement.

BEGIN;

SELECT plan(15);

SELECT has_column('public', 'picks', 'group_id', 'picks has group_id');
SELECT col_not_null('public', 'picks', 'group_id', 'picks.group_id is not null');
SELECT has_column('public', 'pick_settlement', 'group_id', 'pick_settlement has group_id');
SELECT col_not_null('public', 'pick_settlement', 'group_id', 'pick_settlement.group_id is not null');

SELECT results_eq(
  $$ SELECT confrelid = 'public.groups'::regclass
     FROM pg_constraint
     WHERE conrelid = 'public.picks'::regclass
       AND conname = 'picks_group_id_fkey' $$,
  $$ VALUES (TRUE) $$,
  'picks.group_id references groups(id)'
);

SELECT results_eq(
  $$ SELECT confrelid = 'public.groups'::regclass
     FROM pg_constraint
     WHERE conrelid = 'public.pick_settlement'::regclass
       AND conname = 'pick_settlement_group_id_fkey' $$,
  $$ VALUES (TRUE) $$,
  'pick_settlement.group_id references groups(id)'
);

SELECT col_is_pk(
  'public',
  'picks',
  ARRAY['group_id', 'user_id', 'game_id'],
  'picks primary key is group_id, user_id, game_id'
);

SELECT col_is_pk(
  'public',
  'pick_settlement',
  ARRAY['group_id', 'user_id', 'game_id'],
  'pick_settlement primary key is group_id, user_id, game_id'
);

SELECT has_index(
  'public',
  'picks',
  'idx_picks_group_game_user',
  ARRAY['group_id', 'game_id', 'user_id'],
  'picks has group-leading access index'
);

SELECT has_index(
  'public',
  'pick_settlement',
  'idx_pick_settlement_group_game_user',
  ARRAY['group_id', 'game_id', 'user_id'],
  'pick_settlement has group-leading access index'
);

-- Seed users, groups, memberships, and one future game as service role.
SELECT tests.create_supabase_user('tenant_a_player');
SELECT tests.create_supabase_user('tenant_b_player');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('tenant_a_player'), 'player', 'Tenant A Player'),
  (tests.get_supabase_uid('tenant_b_player'), 'player', 'Tenant B Player')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4000-8000-0000000000a2', 'Tenant A'),
  ('00000000-0000-4000-8000-0000000000b2', 'Tenant B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  (
    '00000000-0000-4000-8000-0000000000a2',
    tests.get_supabase_uid('tenant_a_player'),
    'member'
  ),
  (
    '00000000-0000-4000-8000-0000000000b2',
    tests.get_supabase_uid('tenant_b_player'),
    'member'
  );

INSERT INTO public.seasons (year) VALUES (2030)
ON CONFLICT (league, year) DO NOTHING;

INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
VALUES (
  (SELECT id FROM public.seasons WHERE year = 2030 LIMIT 1),
  1,
  now(),
  now() + interval '7 days'
)
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.teams (external_key, name, short_name)
VALUES
  ('GT_A', 'Group Team A', 'GTA'),
  ('GT_B', 'Group Team B', 'GTB')
ON CONFLICT (external_key) DO NOTHING;

INSERT INTO public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id)
VALUES (
  (SELECT id FROM public.weeks WHERE week_number = 1 AND season_id = (SELECT id FROM public.seasons WHERE year = 2030 LIMIT 1)),
  'gt_future',
  now() + interval '1 day',
  (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
  (SELECT id FROM public.teams WHERE external_key = 'GT_B')
)
ON CONFLICT (external_game_id) DO NOTHING;

INSERT INTO public.picks (
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
VALUES (
  '00000000-0000-4000-8000-0000000000b2',
  tests.get_supabase_uid('tenant_b_player'),
  (SELECT id FROM public.games WHERE external_game_id = 'gt_future'),
  (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
  'M',
  now(),
  (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
  -3.5,
  tests.get_supabase_uid('tenant_b_player')
);

INSERT INTO public.pick_settlement (
  group_id,
  user_id,
  game_id,
  pick_id,
  points_delta,
  outcome
)
SELECT
  p.group_id,
  p.user_id,
  p.game_id,
  p.id,
  3,
  'win'::public.pick_outcome
FROM public.picks p
WHERE p.group_id = '00000000-0000-4000-8000-0000000000b2';

-- A group A member cannot see or write group B rows.
SELECT tests.authenticate_as('tenant_a_player');

SELECT results_eq(
  $$ SELECT count(*) FROM public.picks WHERE group_id = '00000000-0000-4000-8000-0000000000b2' $$,
  $$ VALUES (0::bigint) $$,
  'cross-group pick read is denied'
);

SELECT throws_ok(
  $$ INSERT INTO public.picks (
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
     VALUES (
       '00000000-0000-4000-8000-0000000000b2',
       tests.get_supabase_uid('tenant_a_player'),
       (SELECT id FROM public.games WHERE external_game_id = 'gt_future'),
       (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
       'L',
       now(),
       (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
       -3.5,
       tests.get_supabase_uid('tenant_a_player')
     ) $$,
  '42501',
  NULL,
  'cross-group pick write is denied'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.pick_settlement WHERE group_id = '00000000-0000-4000-8000-0000000000b2' $$,
  $$ VALUES (0::bigint) $$,
  'cross-group settlement read is denied'
);

-- The same user/game pair may exist in separate groups.
SELECT tests.clear_authentication();
RESET ROLE;

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES (
  '00000000-0000-4000-8000-0000000000b2',
  tests.get_supabase_uid('tenant_a_player'),
  'member'
);

SELECT tests.authenticate_as('tenant_a_player');

INSERT INTO public.picks (
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
VALUES (
  '00000000-0000-4000-8000-0000000000a2',
  tests.get_supabase_uid('tenant_a_player'),
  (SELECT id FROM public.games WHERE external_game_id = 'gt_future'),
  (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
  'M',
  now(),
  (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
  -3.5,
  tests.get_supabase_uid('tenant_a_player')
);

SELECT lives_ok(
  $$ INSERT INTO public.picks (
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
     VALUES (
       '00000000-0000-4000-8000-0000000000b2',
       tests.get_supabase_uid('tenant_a_player'),
       (SELECT id FROM public.games WHERE external_game_id = 'gt_future'),
       (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
       'H',
       now(),
       (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
       -3.5,
       tests.get_supabase_uid('tenant_a_player')
     ) $$,
  'same user/game pair is allowed in two groups'
);

SELECT throws_ok(
  $$ INSERT INTO public.picks (
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
     VALUES (
       '00000000-0000-4000-8000-0000000000a2',
       tests.get_supabase_uid('tenant_a_player'),
       (SELECT id FROM public.games WHERE external_game_id = 'gt_future'),
       (SELECT id FROM public.teams WHERE external_key = 'GT_B'),
       'H',
       now(),
       (SELECT id FROM public.teams WHERE external_key = 'GT_A'),
       -3.5,
       tests.get_supabase_uid('tenant_a_player')
     ) $$,
  '23505',
  NULL,
  'PK uniqueness is enforced within a group'
);

SELECT * FROM finish();
ROLLBACK;
