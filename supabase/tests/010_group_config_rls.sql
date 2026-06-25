-- 010_group_config_rls.sql
-- pgTAP tests for group_config / group_week_overrides structure and RLS.

BEGIN;

SELECT plan(16);

-- Structure -----------------------------------------------------------------
SELECT has_table('public', 'group_config', 'public.group_config exists');
SELECT has_table('public', 'group_week_overrides', 'public.group_week_overrides exists');

SELECT has_column('public', 'group_config', 'group_id',      'group_config has group_id');
SELECT has_column('public', 'group_config', 'line_source',   'group_config has line_source');
SELECT has_column('public', 'group_config', 'scoring_rules', 'group_config has scoring_rules');

SELECT has_column('public', 'group_week_overrides', 'group_id',  'group_week_overrides has group_id');
SELECT has_column('public', 'group_week_overrides', 'week_id',   'group_week_overrides has week_id');
SELECT has_column('public', 'group_week_overrides', 'overrides', 'group_week_overrides has overrides');

-- Seed ----------------------------------------------------------------------
SELECT tests.create_supabase_user('cfg_member_a');
SELECT tests.create_supabase_user('cfg_member_b');

INSERT INTO public.users (id, role, display_name) VALUES
  (tests.get_supabase_uid('cfg_member_a'), 'player', 'Config Member A'),
  (tests.get_supabase_uid('cfg_member_b'), 'player', 'Config Member B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name) VALUES
  ('00000000-0000-4000-8000-000000000ca1', 'Config Group A'),
  ('00000000-0000-4000-8000-000000000cb1', 'Config Group B');

INSERT INTO public.group_memberships (group_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000000ca1', tests.get_supabase_uid('cfg_member_a'), 'member'),
  ('00000000-0000-4000-8000-000000000cb1', tests.get_supabase_uid('cfg_member_b'), 'member');

-- Insert config rows via service role (bypasses RLS)
INSERT INTO public.group_config (group_id, line_source, scoring_rules) VALUES
  ('00000000-0000-4000-8000-000000000ca1', 'fanduel', '{}'),
  ('00000000-0000-4000-8000-000000000cb1', 'fanduel', '{}');

-- Need a week to attach overrides to.
-- Year 2077 is a sentinel with no real NFL data; explicit id= values were
-- previously used but ON CONFLICT DO NOTHING silently skipped the insert
-- when a real season for that year already existed, breaking the FK on weeks.
INSERT INTO public.seasons (year) VALUES (2077) ON CONFLICT (league, year) DO NOTHING;
INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts)
SELECT s.id, 1, now(), now() + interval '7 days'
FROM public.seasons s WHERE s.year = 2077
ON CONFLICT (season_id, week_number) DO NOTHING;

INSERT INTO public.group_week_overrides (group_id, week_id, overrides) VALUES
  ('00000000-0000-4000-8000-000000000ca1',
   (SELECT w.id FROM public.weeks w JOIN public.seasons s ON s.id = w.season_id
    WHERE s.year = 2077 AND w.week_number = 1),
   '{"double_points": true}');

-- Member A can read their own group config ----------------------------------
SELECT tests.authenticate_as('cfg_member_a');

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_config $$,
  $$ VALUES (1::bigint) $$,
  'member can read their own group config only'
);

SELECT results_eq(
  $$ SELECT line_source FROM public.group_config WHERE group_id = '00000000-0000-4000-8000-000000000ca1' $$,
  $$ VALUES ('fanduel'::text) $$,
  'member can read line_source from their group config'
);

-- Member A cannot read Group B config ---------------------------------------
SELECT results_eq(
  $$ SELECT count(*) FROM public.group_config
     WHERE group_id = '00000000-0000-4000-8000-000000000cb1' $$,
  $$ VALUES (0::bigint) $$,
  'member cannot read another group config'
);

-- Per-week override keyed correctly -----------------------------------------
SELECT results_eq(
  $$ SELECT overrides->>'double_points' FROM public.group_week_overrides
     WHERE group_id = '00000000-0000-4000-8000-000000000ca1'
       AND week_id = (SELECT w.id FROM public.weeks w JOIN public.seasons s ON s.id = w.season_id
                      WHERE s.year = 2077 AND w.week_number = 1) $$,
  $$ VALUES ('true'::text) $$,
  'per-week override keyed by (group_id, week_id) is readable by group member'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_week_overrides $$,
  $$ VALUES (1::bigint) $$,
  'member can only see their own group week overrides'
);

-- Member A cannot insert config directly ------------------------------------
SELECT throws_ok(
  $$ INSERT INTO public.group_config (group_id, line_source, scoring_rules)
     VALUES ('00000000-0000-4000-8000-000000000cb1', 'fanduel', '{}') $$,
  '42501',
  NULL,
  'authenticated user cannot insert group_config directly'
);

-- Member B cannot see Group A config ----------------------------------------
SELECT tests.authenticate_as('cfg_member_b');

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_config
     WHERE group_id = '00000000-0000-4000-8000-000000000ca1' $$,
  $$ VALUES (0::bigint) $$,
  'group B member cannot read group A config'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_week_overrides
     WHERE group_id = '00000000-0000-4000-8000-000000000ca1' $$,
  $$ VALUES (0::bigint) $$,
  'group B member cannot read group A week overrides'
);

SELECT * FROM finish();
ROLLBACK;
