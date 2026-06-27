-- 025_paginated_reads.sql
-- pgTAP coverage for the bounded, keyset-paginated leaderboard/members reads
-- (issue #152, ADR-0002 query discipline). Asserts:
--   1. The three page RPCs exist.
--   2. The group_id-leading keyset indexes exist (the EXPLAIN guard's structural half;
--      the integration suite proves the planner actually uses them).
--   3. The RPCs are service_role-only -- never anon/authenticated-executable -- because
--      they take a group_id parameter and would otherwise leak cross-group data
--      (ADR-0002 cross-group denial).
--   4. group_members_page keyset behaviour: bounded page size, correct order
--      (role -> joined_at -> user_id), and a stable second page via the cursor with no
--      overlap.
--   5. leaderboard_season_page / group_season_years execute and return an empty,
--      bounded result for a group with no standings.

BEGIN;

SELECT plan(10);

-- ── 1. The three page RPCs exist ─────────────────────────────────────────────
SELECT is_empty(
  $$ SELECT name
     FROM unnest(ARRAY['leaderboard_season_page', 'group_members_page', 'group_season_years']) AS name
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = name
     ) $$,
  'leaderboard_season_page, group_members_page, group_season_years all exist'
);

-- ── 2. group_id-leading keyset indexes exist ─────────────────────────────────
SELECT has_index(
  'public', 'group_memberships', 'idx_group_memberships_group_role_joined',
  'group_memberships has the (group_id, role, joined_at, user_id) keyset index'
);
SELECT has_index(
  'public', 'leaderboard_season_totals', 'idx_leaderboard_season_totals_keyset',
  'leaderboard_season_totals has the (group_id, season_year, totals..., user_id) keyset index'
);

-- ── 3. service_role-only reachability ────────────────────────────────────────
-- Negative: none of the page RPCs may be executable by anon or authenticated.
SELECT is_empty(
  $$ SELECT p.proname
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN aclexplode(p.proacl) a ON a.privilege_type = 'EXECUTE'
     JOIN pg_roles r ON r.oid = a.grantee
     WHERE n.nspname = 'public'
       AND p.proname IN ('leaderboard_season_page', 'group_members_page', 'group_season_years')
       AND r.rolname IN ('anon', 'authenticated') $$,
  'no page RPC is executable by anon or authenticated (server is the group_id trust boundary)'
);
-- Positive: service_role must be able to execute all three.
SELECT is_empty(
  $$ SELECT name
     FROM unnest(ARRAY['leaderboard_season_page', 'group_members_page', 'group_season_years']) AS name
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       JOIN aclexplode(p.proacl) a ON a.privilege_type = 'EXECUTE'
       JOIN pg_roles r ON r.oid = a.grantee
       WHERE n.nspname = 'public' AND p.proname = name AND r.rolname = 'service_role'
     ) $$,
  'service_role can execute all three page RPCs'
);

-- ── Seed a group with one commissioner + three members at distinct join times ──
SELECT tests.create_supabase_user('pm_commish');
SELECT tests.create_supabase_user('pm_member1');
SELECT tests.create_supabase_user('pm_member2');
SELECT tests.create_supabase_user('pm_member3');

INSERT INTO public.users (id, role, display_name)
VALUES
  (tests.get_supabase_uid('pm_commish'), 'player', 'PM Commish'),
  (tests.get_supabase_uid('pm_member1'), 'player', 'PM Member1'),
  (tests.get_supabase_uid('pm_member2'), 'player', 'PM Member2'),
  (tests.get_supabase_uid('pm_member3'), 'player', 'PM Member3')
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, display_name = EXCLUDED.display_name;

INSERT INTO public.groups (id, name)
VALUES ('00000000-0000-4152-8000-000000000001', 'PM Group');

-- joined_at ascending in the same order as the expected page order; commissioner
-- sorts first by role regardless of its (latest) join time, proving role leads.
INSERT INTO public.group_memberships (group_id, user_id, role, joined_at)
VALUES
  ('00000000-0000-4152-8000-000000000001', tests.get_supabase_uid('pm_commish'), 'commissioner', '2023-01-01T00:00:00Z'),
  ('00000000-0000-4152-8000-000000000001', tests.get_supabase_uid('pm_member1'), 'member',       '2020-01-01T00:00:00Z'),
  ('00000000-0000-4152-8000-000000000001', tests.get_supabase_uid('pm_member2'), 'member',       '2021-01-01T00:00:00Z'),
  ('00000000-0000-4152-8000-000000000001', tests.get_supabase_uid('pm_member3'), 'member',       '2022-01-01T00:00:00Z');

-- ── 4. group_members_page keyset behaviour ───────────────────────────────────
-- Page 1 (limit 2): commissioner (role leads), then the earliest-joined member.
SELECT is(
  (SELECT array_agg(user_id ORDER BY role, joined_at, user_id)
   FROM public.group_members_page('00000000-0000-4152-8000-000000000001'::uuid, 2)),
  ARRAY[tests.get_supabase_uid('pm_commish'), tests.get_supabase_uid('pm_member1')],
  'page 1 is bounded to the limit and ordered role -> joined_at (commissioner first)'
);

-- Page 2 (limit 2) fed the last row of page 1 as the keyset cursor: the next two
-- members, in order, with no overlap with page 1.
SELECT is(
  (WITH page1 AS (
      SELECT role, joined_at, user_id
      FROM public.group_members_page('00000000-0000-4152-8000-000000000001'::uuid, 2)
   ),
   cursor_row AS (
      SELECT role, joined_at, user_id FROM page1
      ORDER BY role DESC, joined_at DESC, user_id DESC
      LIMIT 1
   )
   SELECT array_agg(p.user_id ORDER BY p.role, p.joined_at, p.user_id)
   FROM cursor_row c,
        LATERAL public.group_members_page(
          '00000000-0000-4152-8000-000000000001'::uuid, 2, c.role, c.joined_at, c.user_id
        ) p),
  ARRAY[tests.get_supabase_uid('pm_member2'), tests.get_supabase_uid('pm_member3')],
  'page 2 (via keyset cursor) returns the next two members in order, no overlap'
);

-- A generous page returns every member exactly once (bounded but complete).
SELECT is(
  (SELECT count(DISTINCT user_id)::int
   FROM public.group_members_page('00000000-0000-4152-8000-000000000001'::uuid, 100)),
  4,
  'a full page returns all four members exactly once'
);

-- ── 5. leaderboard_season_page / group_season_years on a group with no standings ──
-- The matview holds no rows for this freshly-created group, so both bounded reads
-- return empty without error (proves they execute and short-circuit cleanly).
SELECT is(
  (SELECT count(*)::int
   FROM public.leaderboard_season_page('00000000-0000-4152-8000-000000000001'::uuid, 2099, 10)),
  0,
  'leaderboard_season_page returns an empty page for a group with no standings'
);
SELECT is(
  (SELECT count(*)::int
   FROM public.group_season_years('00000000-0000-4152-8000-000000000001'::uuid)),
  0,
  'group_season_years returns no years for a group with no standings'
);

SELECT * FROM finish();
ROLLBACK;
