-- 016_group_invites_rls.sql
-- pgTAP tests for group_invites schema, RLS, and redeem_invite RPC.
-- Acceptance criteria (#147):
--   1. Commissioner can create an invite; non-commissioner/non-member cannot.
--   2. redeem_invite with a valid code adds the caller's membership and increments used_count.
--   3. Expired, revoked, and over-max_uses codes are rejected with no membership written.
--   4. Re-redeeming when already a member is a no-op (no duplicate row, no error).

BEGIN;

SELECT plan(25);

-- ── Schema checks ─────────────────────────────────────────────────────────────

SELECT has_table('public', 'group_invites', 'group_invites table exists');
SELECT has_column('public', 'group_invites', 'id',         'group_invites has id');
SELECT has_column('public', 'group_invites', 'group_id',   'group_invites has group_id');
SELECT has_column('public', 'group_invites', 'created_by', 'group_invites has created_by');
SELECT has_column('public', 'group_invites', 'code',       'group_invites has code');
SELECT has_column('public', 'group_invites', 'expires_at', 'group_invites has expires_at');
SELECT has_column('public', 'group_invites', 'max_uses',   'group_invites has max_uses');
SELECT has_column('public', 'group_invites', 'used_count', 'group_invites has used_count');
SELECT has_column('public', 'group_invites', 'revoked_at', 'group_invites has revoked_at');

SELECT has_function(
  'public', 'is_commissioner', ARRAY['uuid'],
  'public.is_commissioner(uuid) exists'
);
SELECT has_function(
  'public', 'redeem_invite', ARRAY['text'],
  'public.redeem_invite(text) exists'
);

-- ── Seed (service role) ───────────────────────────────────────────────────────

SELECT tests.create_supabase_user('gi_commissioner');
SELECT tests.create_supabase_user('gi_member');
SELECT tests.create_supabase_user('gi_outsider');
SELECT tests.create_supabase_user('gi_redeemer');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('gi_commissioner'), 'player', 'GI Commissioner'),
  (tests.get_supabase_uid('gi_member'),       'player', 'GI Member'),
  (tests.get_supabase_uid('gi_outsider'),     'player', 'GI Outsider'),
  (tests.get_supabase_uid('gi_redeemer'),     'player', 'GI Redeemer')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4002-8000-000000000001', 'GI Test Group');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4002-8000-000000000001', tests.get_supabase_uid('gi_commissioner'), 'commissioner'),
  ('00000000-0000-4002-8000-000000000001', tests.get_supabase_uid('gi_member'),       'member');

-- Pre-seed invite rows as service role for RPC tests.
INSERT INTO public.group_invites (id, group_id, created_by, code, max_uses)
VALUES (
  '00000000-0000-4002-8000-0000000000c1',
  '00000000-0000-4002-8000-000000000001',
  tests.get_supabase_uid('gi_commissioner'),
  'VALID-CODE',
  5
);

INSERT INTO public.group_invites (id, group_id, created_by, code, expires_at)
VALUES (
  '00000000-0000-4002-8000-0000000000c2',
  '00000000-0000-4002-8000-000000000001',
  tests.get_supabase_uid('gi_commissioner'),
  'EXPIRED-CODE',
  now() - interval '1 day'
);

INSERT INTO public.group_invites (id, group_id, created_by, code, revoked_at)
VALUES (
  '00000000-0000-4002-8000-0000000000c3',
  '00000000-0000-4002-8000-000000000001',
  tests.get_supabase_uid('gi_commissioner'),
  'REVOKED-CODE',
  now()
);

INSERT INTO public.group_invites (id, group_id, created_by, code, max_uses, used_count)
VALUES (
  '00000000-0000-4002-8000-0000000000c4',
  '00000000-0000-4002-8000-000000000001',
  tests.get_supabase_uid('gi_commissioner'),
  'EXHAUSTED-CODE',
  1,
  1
);

-- ── 1. RLS: commissioner can insert an invite for their group ─────────────────

SELECT tests.authenticate_as('gi_commissioner');

SELECT lives_ok(
  $$ INSERT INTO public.group_invites (group_id, created_by, code)
     VALUES (
       '00000000-0000-4002-8000-000000000001',
       tests.get_supabase_uid('gi_commissioner'),
       'COMMISSIONER-CODE'
     ) $$,
  'commissioner can create an invite for their group'
);

-- ── 2. RLS: plain member cannot insert an invite ──────────────────────────────

SELECT tests.authenticate_as('gi_member');

SELECT throws_ok(
  $$ INSERT INTO public.group_invites (group_id, created_by, code)
     VALUES (
       '00000000-0000-4002-8000-000000000001',
       tests.get_supabase_uid('gi_member'),
       'MEMBER-BAD-CODE'
     ) $$,
  '42501',
  NULL,
  'plain member cannot create an invite'
);

-- ── 3. RLS: outsider cannot insert an invite or read group's invites ───────────

SELECT tests.authenticate_as('gi_outsider');

SELECT throws_ok(
  $$ INSERT INTO public.group_invites (group_id, created_by, code)
     VALUES (
       '00000000-0000-4002-8000-000000000001',
       tests.get_supabase_uid('gi_outsider'),
       'OUTSIDER-BAD-CODE'
     ) $$,
  '42501',
  NULL,
  'outsider cannot create an invite for a group they are not in'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_invites $$,
  $$ VALUES (0::bigint) $$,
  'outsider sees no invites (cross-group read denial)'
);

-- ── 4. redeem_invite: valid code adds membership and increments used_count ─────
-- Stay authenticated as gi_redeemer so RLS allows reading the membership row.

SELECT tests.authenticate_as('gi_redeemer');

SELECT lives_ok(
  $$ SELECT public.redeem_invite('VALID-CODE') $$,
  'redeem_invite succeeds with a valid code'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships
     WHERE group_id = '00000000-0000-4002-8000-000000000001'
       AND user_id  = tests.get_supabase_uid('gi_redeemer') $$,
  $$ VALUES (1::bigint) $$,
  'redeem_invite created exactly one membership row'
);

-- Check used_count as commissioner (only commissioners can read group_invites via RLS).
SELECT tests.authenticate_as('gi_commissioner');

SELECT results_eq(
  $$ SELECT used_count FROM public.group_invites WHERE code = 'VALID-CODE' $$,
  $$ VALUES (1::integer) $$,
  'redeem_invite incremented used_count'
);

-- ── 5. redeem_invite: expired code is rejected ────────────────────────────────
-- Stay as gi_outsider so we can verify no membership was created via RLS 0-row result.

SELECT tests.authenticate_as('gi_outsider');

SELECT throws_ok(
  $$ SELECT public.redeem_invite('EXPIRED-CODE') $$,
  'P0004',
  'invite expired',
  'expired code raises P0004'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships
     WHERE group_id = '00000000-0000-4002-8000-000000000001' $$,
  $$ VALUES (0::bigint) $$,
  'expired code leaves no membership row for the outsider'
);

-- ── 6. redeem_invite: revoked code is rejected ───────────────────────────────

SELECT throws_ok(
  $$ SELECT public.redeem_invite('REVOKED-CODE') $$,
  'P0003',
  'invite revoked',
  'revoked code raises P0003'
);

-- ── 7. redeem_invite: exhausted (over max_uses) code is rejected ──────────────

SELECT throws_ok(
  $$ SELECT public.redeem_invite('EXHAUSTED-CODE') $$,
  'P0005',
  'invite exhausted',
  'exhausted code raises P0005'
);

-- ── 8. redeem_invite: re-redeeming when already a member is a no-op ───────────

SELECT tests.authenticate_as('gi_redeemer');

SELECT lives_ok(
  $$ SELECT public.redeem_invite('VALID-CODE') $$,
  're-redeeming when already a member does not raise an error'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships
     WHERE group_id = '00000000-0000-4002-8000-000000000001'
       AND user_id  = tests.get_supabase_uid('gi_redeemer') $$,
  $$ VALUES (1::bigint) $$,
  're-redeemed invite left exactly one membership row (no duplicate)'
);

SELECT tests.authenticate_as('gi_commissioner');

SELECT results_eq(
  $$ SELECT used_count FROM public.group_invites WHERE code = 'VALID-CODE' $$,
  $$ VALUES (1::integer) $$,
  're-redeemed invite did not increment used_count again'
);

SELECT * FROM finish();
ROLLBACK;
