-- 006_push_notifications.sql
-- pgTAP tests for push_subscriptions / notification_log structure + RLS.

BEGIN;

SELECT plan(14);

-- Structure -----------------------------------------------------------------
SELECT has_table('public', 'push_subscriptions', 'public.push_subscriptions exists');
SELECT has_column('public', 'push_subscriptions', 'user_id',  'push_subscriptions has user_id');
SELECT has_column('public', 'push_subscriptions', 'endpoint', 'push_subscriptions has endpoint');
SELECT has_column('public', 'push_subscriptions', 'p256dh',   'push_subscriptions has p256dh');
SELECT has_column('public', 'push_subscriptions', 'auth_key', 'push_subscriptions has auth_key');
SELECT has_table('public', 'notification_log', 'public.notification_log exists');

-- Seed users ----------------------------------------------------------------
SELECT tests.create_supabase_user('push_a');
SELECT tests.create_supabase_user('push_b');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('push_a'), 'player', 'Push A'),
  (tests.get_supabase_uid('push_b'), 'player', 'Push B')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Seed a notification_log row for A as service role (bypasses RLS)
INSERT INTO public.notification_log (user_id, kind, detail)
VALUES (tests.get_supabase_uid('push_a'), 'test', '{"ok":true}'::jsonb);

-- push_subscriptions RLS ----------------------------------------------------
-- A can insert a subscription for itself
SELECT tests.authenticate_as('push_a');
SELECT lives_ok(
  $$ INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
     VALUES (tests.get_supabase_uid('push_a'), 'ep-a', 'p', 'a') $$,
  'owner can insert their own push subscription'
);

-- A cannot insert a subscription owned by B (with_check violation)
SELECT throws_ok(
  $$ INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
     VALUES (tests.get_supabase_uid('push_b'), 'ep-b', 'p', 'a') $$,
  '42501',
  NULL,
  'cannot insert a push subscription for another user'
);

-- A sees its own subscription
SELECT results_eq(
  $$ SELECT count(*) FROM public.push_subscriptions $$,
  $$ VALUES (1::bigint) $$,
  'owner sees their own push subscription'
);

-- B sees none of A's subscriptions
SELECT tests.authenticate_as('push_b');
SELECT results_eq(
  $$ SELECT count(*) FROM public.push_subscriptions $$,
  $$ VALUES (0::bigint) $$,
  'other user cannot see foreign push subscriptions'
);

-- anon has no privilege on push_subscriptions
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT * FROM public.push_subscriptions LIMIT 1 $$,
  '42501',
  NULL,
  'anon gets permission denied on push_subscriptions'
);
RESET ROLE;

-- notification_log RLS ------------------------------------------------------
-- A reads its own log row
SELECT tests.authenticate_as('push_a');
SELECT results_eq(
  $$ SELECT count(*) FROM public.notification_log $$,
  $$ VALUES (1::bigint) $$,
  'owner reads their own notification_log rows'
);

-- B sees none of A's log rows
SELECT tests.authenticate_as('push_b');
SELECT results_eq(
  $$ SELECT count(*) FROM public.notification_log $$,
  $$ VALUES (0::bigint) $$,
  'other user cannot see foreign notification_log rows'
);

-- anon has no privilege on notification_log
SELECT tests.clear_authentication();
SET ROLE anon;
SELECT throws_ok(
  $$ SELECT * FROM public.notification_log LIMIT 1 $$,
  '42501',
  NULL,
  'anon gets permission denied on notification_log'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
