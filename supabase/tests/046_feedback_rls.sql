-- 046_feedback_rls.sql
-- pgTAP: feedback table structure + RLS matrix (issue #500, ADR-0028).
-- Owner may INSERT + SELECT only their own rows; a non-admin cannot read or update
-- another user's rows; an admin reads all and may update (triage); anon is denied.

BEGIN;

SELECT plan(18);

-- Structure -----------------------------------------------------------------
SELECT has_table('public', 'feedback', 'public.feedback exists');
SELECT has_column('public', 'feedback', 'user_id', 'feedback has user_id');
SELECT has_column('public', 'feedback', 'kind', 'feedback has kind');
SELECT has_column('public', 'feedback', 'body', 'feedback has body');
SELECT has_column('public', 'feedback', 'context', 'feedback has context jsonb');
SELECT has_column('public', 'feedback', 'status', 'feedback has status');
SELECT has_column('public', 'feedback', 'github_issue_url', 'feedback has github_issue_url');
SELECT tests.rls_enabled('public', 'feedback');

-- Seed users ----------------------------------------------------------------
SELECT tests.create_supabase_user('feedback_a');
SELECT tests.create_supabase_user('feedback_b');
SELECT tests.create_supabase_user('feedback_admin');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('feedback_a'), 'player', 'Feedback A'),
  (tests.get_supabase_uid('feedback_b'), 'player', 'Feedback B'),
  (tests.get_supabase_uid('feedback_admin'), 'admin', 'Feedback Admin')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Owner INSERT / SELECT -----------------------------------------------------
SELECT tests.authenticate_as('feedback_a');

SELECT lives_ok(
  $$ INSERT INTO public.feedback (user_id, body) VALUES (tests.get_supabase_uid('feedback_a'), 'A found a bug') $$,
  'owner can insert their own feedback'
);

SELECT throws_ok(
  $$ INSERT INTO public.feedback (user_id, body) VALUES (tests.get_supabase_uid('feedback_b'), 'spoofed') $$,
  '42501',
  NULL,
  'cannot insert feedback attributed to another user'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.feedback $$,
  $$ VALUES (1::bigint) $$,
  'owner sees only their own feedback'
);

-- Seed a row for B as the service role (bypasses RLS) ------------------------
SELECT tests.authenticate_as_service_role();
INSERT INTO public.feedback (user_id, body, kind)
VALUES (tests.get_supabase_uid('feedback_b'), 'B has an idea', 'idea');

-- Cross-user isolation ------------------------------------------------------
SELECT tests.authenticate_as('feedback_b');
SELECT results_eq(
  $$ SELECT count(*) FROM public.feedback $$,
  $$ VALUES (1::bigint) $$,
  'a non-admin cannot see another user''s feedback'
);

-- A non-admin update is a silent no-op under the admin-only UPDATE policy.
SELECT lives_ok(
  $$ UPDATE public.feedback SET status = 'dismissed' $$,
  'non-admin update runs but is filtered by RLS'
);

-- Admin read-all + triage ---------------------------------------------------
SELECT tests.authenticate_as('feedback_admin');

SELECT results_eq(
  $$ SELECT count(*) FROM public.feedback WHERE status = 'dismissed' $$,
  $$ VALUES (0::bigint) $$,
  'the non-admin update changed nothing'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.feedback $$,
  $$ VALUES (2::bigint) $$,
  'admin reads every submission'
);

SELECT lives_ok(
  $$ UPDATE public.feedback SET status = 'triaged' WHERE user_id = tests.get_supabase_uid('feedback_a') $$,
  'admin can triage a submission'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.feedback WHERE status = 'triaged' $$,
  $$ VALUES (1::bigint) $$,
  'admin update takes effect'
);

-- Anon denied ---------------------------------------------------------------
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT * FROM public.feedback LIMIT 1 $$,
  '42501',
  NULL,
  'anon gets permission denied on feedback'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
