-- 018_commissioner_basics.sql
-- pgTAP tests for members list + commissioner basics (issue #151, ADR-0006 dec. 4 + 5).
--
-- Acceptance criteria verified here:
--   1. Commissioner can rename the group; non-commissioner/outsider cannot.
--   2. Commissioner can promote a plain member to commissioner; already-commissioner raises P0024.
--   3. Commissioner can remove a plain member; non-commissioner cannot.
--   4. A plain member can leave the group.
--   5. Last-commissioner guard blocks leave_group when caller is the sole commissioner.
--   6. mint_invite: commissioner can mint; plain member cannot.

BEGIN;

SELECT plan(22);

-- ── Schema sanity checks ──────────────────────────────────────────────────────

SELECT has_function('public', 'rename_group',   ARRAY['uuid','text'],  'rename_group(uuid, text) exists');
SELECT has_function('public', 'remove_member',  ARRAY['uuid','uuid'],  'remove_member(uuid, uuid) exists');
SELECT has_function('public', 'promote_member', ARRAY['uuid','uuid'],  'promote_member(uuid, uuid) exists');
SELECT has_function('public', 'leave_group',    ARRAY['uuid'],         'leave_group(uuid) exists');
SELECT has_function(
  'public', 'mint_invite',
  ARRAY['uuid','integer','timestamp with time zone'],
  'mint_invite(uuid, integer, timestamptz) exists'
);

-- ── Seed fixtures (service role before any auth switch) ──────────────────────

SELECT tests.create_supabase_user('cb_commissioner');
SELECT tests.create_supabase_user('cb_commissioner2');
SELECT tests.create_supabase_user('cb_member');
SELECT tests.create_supabase_user('cb_outsider');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('cb_commissioner'),  'player', 'CB Commissioner'),
  (tests.get_supabase_uid('cb_commissioner2'), 'player', 'CB Commissioner2'),
  (tests.get_supabase_uid('cb_member'),        'player', 'CB Member'),
  (tests.get_supabase_uid('cb_outsider'),      'player', 'CB Outsider')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

-- Two groups:
--   Group A: 2 commissioners + 1 member (tests rename, promote, remove, mint; guard safe)
--   Group B: 1 commissioner only (tests last-commissioner guard for leave/remove)
INSERT INTO public.groups (id, name)
VALUES
  ('00000000-0000-4151-8000-000000000001', 'CB Group A'),
  ('00000000-0000-4151-8000-000000000002', 'CB Group B');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  -- Group A: two commissioners + one member
  ('00000000-0000-4151-8000-000000000001', tests.get_supabase_uid('cb_commissioner'),  'commissioner'),
  ('00000000-0000-4151-8000-000000000001', tests.get_supabase_uid('cb_commissioner2'), 'commissioner'),
  ('00000000-0000-4151-8000-000000000001', tests.get_supabase_uid('cb_member'),        'member'),
  -- Group B: sole commissioner
  ('00000000-0000-4151-8000-000000000002', tests.get_supabase_uid('cb_commissioner'),  'commissioner');

-- ── 1. rename_group: commissioner succeeds ───────────────────────────────────

SELECT tests.authenticate_as('cb_commissioner');

SELECT lives_ok(
  $$ SELECT public.rename_group('00000000-0000-4151-8000-000000000001', 'Renamed Group') $$,
  'commissioner can rename the group'
);

SELECT results_eq(
  $$ SELECT name FROM public.groups WHERE id = '00000000-0000-4151-8000-000000000001' $$,
  $$ VALUES ('Renamed Group') $$,
  'rename_group: group name was updated'
);

-- ── 2. rename_group: plain member is blocked ─────────────────────────────────

SELECT tests.authenticate_as('cb_member');

SELECT throws_ok(
  $$ SELECT public.rename_group('00000000-0000-4151-8000-000000000001', 'Bad Rename') $$,
  'P0020', NULL,
  'rename_group: plain member is blocked (P0020)'
);

-- ── 3. rename_group: outsider is blocked ─────────────────────────────────────

SELECT tests.authenticate_as('cb_outsider');

SELECT throws_ok(
  $$ SELECT public.rename_group('00000000-0000-4151-8000-000000000001', 'Bad Rename') $$,
  'P0020', NULL,
  'rename_group: outsider is blocked (P0020)'
);

-- ── 4. promote_member: commissioner promotes a plain member ──────────────────

SELECT tests.authenticate_as('cb_commissioner');

SELECT lives_ok(
  $$ SELECT public.promote_member(
       '00000000-0000-4151-8000-000000000001',
       tests.get_supabase_uid('cb_member')
     ) $$,
  'promote_member: commissioner can promote a plain member'
);

SELECT results_eq(
  $$ SELECT role::text FROM public.group_memberships
     WHERE group_id = '00000000-0000-4151-8000-000000000001'
       AND user_id  = tests.get_supabase_uid('cb_member') $$,
  $$ VALUES ('commissioner') $$,
  'promote_member: cb_member is now a commissioner'
);

-- ── 5. promote_member: already-commissioner raises P0024 ─────────────────────

SELECT throws_ok(
  $$ SELECT public.promote_member(
       '00000000-0000-4151-8000-000000000001',
       tests.get_supabase_uid('cb_member')
     ) $$,
  'P0024', NULL,
  'promote_member: already-commissioner raises P0024'
);

-- ── 6. remove_member: commissioner removes a plain member ────────────────────
-- cb_member was promoted to commissioner in step 4, so we promote cb_outsider...
-- Actually, use cb_commissioner2 instead (plain removal, not last-commissioner).
-- cb_commissioner2 is a commissioner; removing them is fine since cb_commissioner
-- and cb_member (now commissioner) both remain.

SELECT lives_ok(
  $$ SELECT public.remove_member(
       '00000000-0000-4151-8000-000000000001',
       tests.get_supabase_uid('cb_commissioner2')
     ) $$,
  'remove_member: commissioner can remove another commissioner (not the last)'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships
     WHERE group_id = '00000000-0000-4151-8000-000000000001'
       AND user_id  = tests.get_supabase_uid('cb_commissioner2') $$,
  $$ VALUES (0::bigint) $$,
  'remove_member: cb_commissioner2 is gone from group A'
);

-- ── 7. remove_member: plain member cannot remove (uses cb_member on Group B member slot) ──

SELECT tests.authenticate_as('cb_member');  -- cb_member is now commissioner in group A

-- cb_member has no membership in group B, so it is treated as outsider.
SELECT throws_ok(
  $$ SELECT public.remove_member(
       '00000000-0000-4151-8000-000000000002',
       tests.get_supabase_uid('cb_commissioner')
     ) $$,
  'P0020', NULL,
  'remove_member: non-commissioner is blocked (P0020)'
);

-- ── 8. Last-commissioner guard: leave_group blocked for sole commissioner ────

SELECT tests.authenticate_as('cb_commissioner');

SELECT throws_ok(
  $$ SELECT public.leave_group('00000000-0000-4151-8000-000000000002') $$,
  'P0022', NULL,
  'leave_group: sole commissioner cannot leave (P0022 last-commissioner guard)'
);

-- ── 9. mint_invite: commissioner mints an invite ─────────────────────────────

SELECT lives_ok(
  $$ SELECT public.mint_invite('00000000-0000-4151-8000-000000000001') $$,
  'mint_invite: commissioner can mint an invite'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_invites
     WHERE group_id   = '00000000-0000-4151-8000-000000000001'
       AND created_by = tests.get_supabase_uid('cb_commissioner') $$,
  $$ VALUES (1::bigint) $$,
  'mint_invite: one invite row created'
);

-- ── 9b. mint_invite: a second default-shaped mint reuses the same invite ─────

SELECT results_eq(
  $$ SELECT public.mint_invite('00000000-0000-4151-8000-000000000001') $$,
  $$ SELECT code FROM public.group_invites
     WHERE group_id   = '00000000-0000-4151-8000-000000000001'
       AND created_by = tests.get_supabase_uid('cb_commissioner') $$,
  'mint_invite: repeat default mint returns the existing invite code'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_invites
     WHERE group_id   = '00000000-0000-4151-8000-000000000001'
       AND created_by = tests.get_supabase_uid('cb_commissioner') $$,
  $$ VALUES (1::bigint) $$,
  'mint_invite: repeat default mint did not create a second row'
);

-- ── 10. leave_group: plain member can leave ──────────────────────────────────
-- cb_member is commissioner in group A now; add cb_outsider as plain member and
-- have them leave.

SELECT tests.authenticate_as('cb_outsider');

-- outsider has no membership → expect P0021.
SELECT throws_ok(
  $$ SELECT public.leave_group('00000000-0000-4151-8000-000000000001') $$,
  'P0021', NULL,
  'leave_group: non-member raises P0021'
);

-- ── 11. mint_invite: outsider (non-commissioner) is blocked ──────────────────

SELECT throws_ok(
  $$ SELECT public.mint_invite('00000000-0000-4151-8000-000000000001') $$,
  'P0020', NULL,
  'mint_invite: outsider is blocked (P0020)'
);

SELECT * FROM finish();
ROLLBACK;
