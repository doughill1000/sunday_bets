-- 025_display_name_and_group_cap.sql
-- pgTAP tests for issue #223:
--   B — users_display_name_max_len check constraint (40 chars)
--   C — redeem_invite group size cap (50 members, P0006)

BEGIN;

SELECT plan(7);

-- ── B: display name constraint ────────────────────────────────────────────────

-- Schema: constraint must exist.
SELECT results_eq(
  $$ SELECT count(*)::int FROM pg_constraint
     WHERE conrelid = 'public.users'::regclass
       AND contype = 'c'
       AND conname = 'users_display_name_max_len' $$,
  $$ VALUES (1) $$,
  'users_display_name_max_len check constraint exists'
);

-- Seed users via the auth helper so public.users rows are created by the trigger.
SELECT tests.create_supabase_user('dn_valid');
SELECT tests.create_supabase_user('dn_over');

-- B1: 40-char display_name is allowed.
SELECT lives_ok(
  $$ UPDATE public.users SET display_name = repeat('a', 40)
     WHERE id = tests.get_supabase_uid('dn_valid') $$,
  '40-char display_name is accepted'
);

-- B2: 41-char display_name is rejected.
SELECT throws_ok(
  $$ UPDATE public.users SET display_name = repeat('b', 41)
     WHERE id = tests.get_supabase_uid('dn_over') $$,
  '23514',
  NULL,
  '41-char display_name violates users_display_name_max_len'
);

-- B3: 38 non-whitespace chars with surrounding spaces → 38 trimmed → OK.
SELECT lives_ok(
  $$ UPDATE public.users SET display_name = '  ' || repeat('c', 38) || '  '
     WHERE id = tests.get_supabase_uid('dn_valid') $$,
  '38 trimmed chars with surrounding whitespace is accepted'
);

-- ── C: group size cap in redeem_invite ───────────────────────────────────────

-- Seed two named users; all others are synthetic UUIDs via replica mode.
SELECT tests.create_supabase_user('cap_commissioner');
SELECT tests.create_supabase_user('cap_joiner');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('cap_commissioner'), 'player', 'Cap Commissioner'),
  (tests.get_supabase_uid('cap_joiner'),       'player', 'Cap Joiner')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4025-8000-000000000010', 'Cap Test Group');

-- Commissioner is member 1.
INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES ('00000000-0000-4025-8000-000000000010',
        tests.get_supabase_uid('cap_commissioner'), 'commissioner');

-- Fill remaining 49 slots with synthetic UUIDs.
-- session_replication_role=replica bypasses FK constraint triggers for bulk seeding;
-- CHECK constraints are still enforced (they are not triggers).
SET LOCAL session_replication_role = replica;
INSERT INTO public.group_memberships (group_id, user_id, role)
SELECT
  '00000000-0000-4025-8000-000000000010',
  gen_random_uuid(),
  'member'
FROM generate_series(1, 49);
SET LOCAL session_replication_role = DEFAULT;

INSERT INTO public.group_invites (id, group_id, created_by, code, max_uses)
VALUES (
  '00000000-0000-4025-8000-0000000000d1',
  '00000000-0000-4025-8000-000000000010',
  tests.get_supabase_uid('cap_commissioner'),
  'FULL-GROUP-CODE',
  NULL
);

-- C1: redeem_invite raises P0006 when group already has 50 members.
SELECT tests.authenticate_as('cap_joiner');

SELECT throws_ok(
  $$ SELECT public.redeem_invite('FULL-GROUP-CODE') $$,
  'P0006',
  'group is full',
  'redeem_invite raises P0006 when group has 50 members'
);

-- C2: no membership row was written for the blocked joiner.
-- RLS hides all group rows from non-members; 0 confirms no membership was created.
SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships
     WHERE group_id = '00000000-0000-4025-8000-000000000010'
       AND user_id  = tests.get_supabase_uid('cap_joiner') $$,
  $$ VALUES (0::bigint) $$,
  'P0006 rejection leaves no membership row for the joiner'
);

-- C3: commissioner sees all 50 members (cap check did not mutate state).
SELECT tests.authenticate_as('cap_commissioner');

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_memberships
     WHERE group_id = '00000000-0000-4025-8000-000000000010' $$,
  $$ VALUES (50::bigint) $$,
  'group membership count remains 50 after blocked redemption'
);

SELECT * FROM finish();
ROLLBACK;
