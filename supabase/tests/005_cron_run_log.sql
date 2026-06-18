-- 05-cron_run_log.sql
-- pgTAP tests for public.cron_run_log table, RLS, and column structure

BEGIN;

SELECT plan(10);

-- 1) Table exists
SELECT has_table('public', 'cron_run_log', 'public.cron_run_log exists');

-- 2–7) Expected columns exist
SELECT has_column('public', 'cron_run_log', 'id',          'cron_run_log has column id');
SELECT has_column('public', 'cron_run_log', 'job',         'cron_run_log has column job');
SELECT has_column('public', 'cron_run_log', 'started_at',  'cron_run_log has column started_at');
SELECT has_column('public', 'cron_run_log', 'ok',          'cron_run_log has column ok');
SELECT has_column('public', 'cron_run_log', 'summary',     'cron_run_log has column summary');
SELECT has_column('public', 'cron_run_log', 'error',       'cron_run_log has column error');

-- Seed test users
SELECT tests.create_supabase_user('crl_admin');
SELECT tests.create_supabase_user('crl_player');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('crl_admin'),  'admin',  'CRL Admin'),
  (tests.get_supabase_uid('crl_player'), 'player', 'CRL Player')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      display_name = EXCLUDED.display_name;

-- Seed one row as service role (bypasses RLS) so read tests have data
INSERT INTO public.cron_run_log (job, started_at, finished_at, ok, summary)
VALUES ('test_job', now() - interval '1 minute', now(), true, '{"synced":1}'::jsonb);

-- 8) Admin can read cron_run_log via RLS
SELECT tests.authenticate_as('crl_admin');
SELECT results_eq(
  $$ SELECT count(*) FROM public.cron_run_log $$,
  $$ VALUES (1::bigint) $$,
  'admin can read cron_run_log rows'
);

-- 9) Non-admin authenticated user sees 0 rows (RLS denies)
SELECT tests.authenticate_as('crl_player');
SELECT results_eq(
  $$ SELECT count(*) FROM public.cron_run_log $$,
  $$ VALUES (0::bigint) $$,
  'non-admin authenticated user sees no rows in cron_run_log'
);

-- 10) Anon role has no table privilege (cannot even query)
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT * FROM public.cron_run_log LIMIT 1 $$,
  '42501',
  'permission denied for table cron_run_log',
  'anon role gets permission denied on cron_run_log'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
