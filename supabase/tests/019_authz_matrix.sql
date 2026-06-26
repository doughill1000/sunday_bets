-- 019_authz_matrix.sql
-- pgTAP authorization matrix for issue #153 (commissioner RLS hardening + grant audit).
-- Complements 008/016/018 by asserting the full member / non-member / commissioner /
-- anon matrix that those tests don't:
--   1. anon has zero Data API reachability (permission denied, 42501) on every table
--      with no anon RLS policy -- verifies the default-ACL revoke added to
--      player_grants.sql.
--   2. group_memberships INSERT is closed to ALL client roles (member, commissioner,
--      non-member) -- verifies the no-client-write policy + dropped INSERT grant.
--      The service-role insert path used by addGroupMember is unaffected.
--   3. commissioner write surface: a commissioner manages their group's invites; a
--      plain member can neither read nor write them; and member writes to groups /
--      group_config are denied (no grant + no-client-write policy).
-- ADR-0002 (group tenancy boundary) + ADR-0006 (group lifecycle).

BEGIN;

SELECT plan(18);

-- ── Seed fixtures (default role bypasses RLS) ─────────────────────────────────
SELECT tests.create_supabase_user('az_commissioner');
SELECT tests.create_supabase_user('az_member');
SELECT tests.create_supabase_user('az_outsider');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('az_commissioner'), 'player', 'AZ Commissioner'),
  (tests.get_supabase_uid('az_member'),       'player', 'AZ Member'),
  (tests.get_supabase_uid('az_outsider'),     'player', 'AZ Outsider')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4153-8000-000000000001', 'AZ Group');

INSERT INTO public.group_memberships (group_id, user_id, role)
VALUES
  ('00000000-0000-4153-8000-000000000001', tests.get_supabase_uid('az_commissioner'), 'commissioner'),
  ('00000000-0000-4153-8000-000000000001', tests.get_supabase_uid('az_member'),       'member');

INSERT INTO public.group_config (group_id, line_source)
VALUES ('00000000-0000-4153-8000-000000000001', 'fanduel')
ON CONFLICT (group_id) DO UPDATE SET line_source = EXCLUDED.line_source;

INSERT INTO public.group_invites (id, group_id, created_by, code)
VALUES (
  '00000000-0000-4153-8000-0000000000f1',
  '00000000-0000-4153-8000-000000000001',
  tests.get_supabase_uid('az_commissioner'),
  'AZSEEDCODE'
);

-- ── 1. anon Data API denial: permission denied on every non-anon table ────────
-- Default Supabase ACL would grant anon ALL (RLS then returns 0 rows, no error);
-- the revoke in player_grants.sql/zz_group_grants.sql makes these raise 42501.
SELECT tests.clear_authentication();
SET ROLE anon;

SELECT throws_ok($$ SELECT 1 FROM public.settings          LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on settings');
SELECT throws_ok($$ SELECT 1 FROM public.audit_log         LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on audit_log');
SELECT throws_ok($$ SELECT 1 FROM public.picks             LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on picks');
SELECT throws_ok($$ SELECT 1 FROM public.pick_settlement   LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on pick_settlement');
SELECT throws_ok($$ SELECT 1 FROM public.groups            LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on groups');
SELECT throws_ok($$ SELECT 1 FROM public.group_memberships LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on group_memberships');
SELECT throws_ok($$ SELECT 1 FROM public.group_config      LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on group_config');
SELECT throws_ok($$ SELECT 1 FROM public.group_invites     LIMIT 1 $$, '42501', NULL, 'anon denied SELECT on group_invites');

RESET ROLE;

-- ── 2. group_memberships INSERT closed to every client role ───────────────────
-- No-client-write policy (WITH CHECK false) + dropped INSERT grant => 42501 for all.
SELECT tests.authenticate_as('az_member');
SELECT throws_ok(
  $$ INSERT INTO public.group_memberships (group_id, user_id, role)
     VALUES ('00000000-0000-4153-8000-000000000001', tests.get_supabase_uid('az_outsider'), 'member') $$,
  '42501', NULL,
  'member cannot INSERT into group_memberships (no-client-write)'
);

SELECT tests.authenticate_as('az_commissioner');
SELECT throws_ok(
  $$ INSERT INTO public.group_memberships (group_id, user_id, role)
     VALUES ('00000000-0000-4153-8000-000000000001', tests.get_supabase_uid('az_outsider'), 'member') $$,
  '42501', NULL,
  'commissioner cannot INSERT into group_memberships directly (writes go through RPCs)'
);

SELECT tests.authenticate_as('az_outsider');
SELECT throws_ok(
  $$ INSERT INTO public.group_memberships (group_id, user_id, role)
     VALUES ('00000000-0000-4153-8000-000000000001', tests.get_supabase_uid('az_outsider'), 'member') $$,
  '42501', NULL,
  'non-member cannot INSERT into group_memberships'
);

-- ── 3. commissioner write surface on group_invites ────────────────────────────
SELECT tests.authenticate_as('az_commissioner');

SELECT lives_ok(
  $$ INSERT INTO public.group_invites (group_id, created_by, code)
     VALUES (
       '00000000-0000-4153-8000-000000000001',
       tests.get_supabase_uid('az_commissioner'),
       'AZNEWCODE'
     ) $$,
  'commissioner can INSERT a group_invite for their own group'
);

SELECT lives_ok(
  $$ UPDATE public.group_invites SET revoked_at = now() WHERE code = 'AZSEEDCODE' $$,
  'commissioner can UPDATE (revoke) their group_invite'
);

SELECT results_eq(
  $$ SELECT revoked_at IS NOT NULL FROM public.group_invites WHERE code = 'AZSEEDCODE' $$,
  $$ VALUES (true) $$,
  'commissioner UPDATE revoked the seeded invite'
);

-- ── 4. plain member is shut out of group_invites and other-group writes ───────
SELECT tests.authenticate_as('az_member');

SELECT throws_ok(
  $$ INSERT INTO public.group_invites (group_id, created_by, code)
     VALUES (
       '00000000-0000-4153-8000-000000000001',
       tests.get_supabase_uid('az_member'),
       'AZBADCODE'
     ) $$,
  '42501', NULL,
  'plain member cannot INSERT a group_invite (commissioner-only WITH CHECK)'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.group_invites $$,
  $$ VALUES (0::bigint) $$,
  'plain member cannot SELECT group_invites (commissioner-only)'
);

SELECT throws_ok(
  $$ UPDATE public.groups SET name = 'Hacked'
     WHERE id = '00000000-0000-4153-8000-000000000001' $$,
  '42501', NULL,
  'member cannot UPDATE groups (no UPDATE grant / no-client-write policy)'
);

SELECT throws_ok(
  $$ UPDATE public.group_config SET line_source = 'hacked'
     WHERE group_id = '00000000-0000-4153-8000-000000000001' $$,
  '42501', NULL,
  'member cannot UPDATE group_config (no UPDATE grant / no-client-write policy)'
);

SELECT * FROM finish();
ROLLBACK;
