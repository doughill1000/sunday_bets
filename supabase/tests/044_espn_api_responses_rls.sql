-- 044-espn_api_responses_rls.sql
-- pgTAP tests for public.espn_api_responses table, RLS, and column structure
-- (issue #450, ADR-0025). Mirrors 037_odds_api_responses_rls.sql — same admin-only
-- read / service-role-only write contract.

BEGIN;

SELECT plan(11);

-- 1) Table exists
SELECT has_table('public', 'espn_api_responses', 'public.espn_api_responses exists');

-- 2–7) Expected columns exist
SELECT has_column('public', 'espn_api_responses', 'id',             'espn_api_responses has column id');
SELECT has_column('public', 'espn_api_responses', 'endpoint',       'espn_api_responses has column endpoint');
SELECT has_column('public', 'espn_api_responses', 'fetched_at',     'espn_api_responses has column fetched_at');
SELECT has_column('public', 'espn_api_responses', 'http_status',    'espn_api_responses has column http_status');
SELECT has_column('public', 'espn_api_responses', 'request_params', 'espn_api_responses has column request_params');
SELECT has_column('public', 'espn_api_responses', 'body',           'espn_api_responses has column body');

-- Seed test users
SELECT tests.create_supabase_user('ear_admin');
SELECT tests.create_supabase_user('ear_player');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('ear_admin'),  'admin',  'EAR Admin'),
  (tests.get_supabase_uid('ear_player'), 'player', 'EAR Player')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      display_name = EXCLUDED.display_name;

-- Clear any rows real app code (e.g. the integration suite) already committed
-- to this table outside this transaction, so the count assertions below are
-- deterministic regardless of what else has run against this local DB. Safe:
-- this whole file runs in one transaction that is rolled back at the end.
DELETE FROM public.espn_api_responses;

-- Seed one row as service role (bypasses RLS) so read tests have data.
INSERT INTO public.espn_api_responses (endpoint, http_status, request_params, body)
VALUES ('scoreboard', 200, '{"seasontype":"2","week":"1","dates":"2026"}'::jsonb, '{"events":[]}'::jsonb);

-- 8) Admin can read espn_api_responses via RLS
SELECT tests.authenticate_as('ear_admin');
SELECT results_eq(
  $$ SELECT count(*) FROM public.espn_api_responses $$,
  $$ VALUES (1::bigint) $$,
  'admin can read espn_api_responses rows'
);

-- 9) Non-admin authenticated user sees 0 rows (RLS denies)
SELECT tests.authenticate_as('ear_player');
SELECT results_eq(
  $$ SELECT count(*) FROM public.espn_api_responses $$,
  $$ VALUES (0::bigint) $$,
  'non-admin authenticated user sees no rows in espn_api_responses'
);

-- 10) No authenticated role (admin included) has an INSERT grant on this table --
-- writes come from the service-role client only (src/lib/server/espnApiResponses.ts).
SELECT tests.authenticate_as('ear_admin');
SELECT throws_ok(
  $$ INSERT INTO public.espn_api_responses (endpoint, http_status, request_params)
     VALUES ('scoreboard', 200, '{}'::jsonb) $$,
  '42501',
  'permission denied for table espn_api_responses',
  'authenticated (even admin) cannot insert into espn_api_responses -- writes are service-role only'
);

-- 11) Anon role has no table privilege (cannot even query)
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT * FROM public.espn_api_responses LIMIT 1 $$,
  '42501',
  'permission denied for table espn_api_responses',
  'anon role gets permission denied on espn_api_responses'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
