-- 057_player_ratings_rebuild_rpc.sql
-- pgTAP tests for the atomic player_ratings rebuild RPC (issue #619, ADR-0032 §8 follow-up).
--
-- rebuild.ts's TS fold + the concurrency/atomicity guarantee (a transaction-scoped advisory lock
-- serializing concurrent callers) can't be exercised here — pgTAP runs this whole file as one
-- transaction/session, so there is no second session to race against; that guarantee is instead
-- proven by a real cross-connection integration test (tests/integration/playerRatings.test.ts).
-- This suite owns what IS testable in-session: the RPC's grants (closed by default, per
-- 021_function_grant_baseline.sql's mechanism) and its SQL-level upsert+prune correctness —
-- upsert-on-conflict, clearing the table when handed no rows, and pruning rows that fall out of a
-- narrower result set. `player_ratings` carries no FK to groups/users (it's a rebuilt read model,
-- ADR-0032 §8), so this suite can use bare synthetic UUIDs with no other fixture setup.
--
-- This suite owns the 057_ namespace synthetic UUIDs (05701, 05702, 05711, 05712 below).

BEGIN;

SELECT plan(11);

-- ── 1-3. Grants: closed by default (no anon/authenticated execute), service_role can call it ──
SELECT has_function(
  'public', '_rebuild_player_ratings', ARRAY['jsonb', 'timestamptz'],
  '1. _rebuild_player_ratings(jsonb, timestamptz) exists'
);
SELECT ok(
  has_function_privilege('service_role', 'public._rebuild_player_ratings(jsonb, timestamptz)', 'EXECUTE'),
  '2. service_role can EXECUTE _rebuild_player_ratings'
);
SELECT is_empty(
  $$ SELECT r.rolname
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN aclexplode(p.proacl) a ON a.privilege_type = 'EXECUTE'
     JOIN pg_roles r ON r.oid = a.grantee
     WHERE n.nspname = 'public' AND p.proname = '_rebuild_player_ratings'
       AND r.rolname IN ('anon', 'authenticated') $$,
  '3. neither anon nor authenticated can EXECUTE _rebuild_player_ratings (born closed)'
);

-- ── Fixture: a pre-existing "stale" row this suite's rebuilds must prune ────────────────────────
INSERT INTO public.player_ratings (group_id, user_id, rating, decisions, decisions_to_qualify, season_delta, computed_at)
VALUES (
  '00000000-0000-4000-8000-000000005701', '00000000-0000-4000-8000-000000005701',
  1500, 20, 0, NULL, '2020-01-01T00:00:00Z'
);

-- ── 4-5. Empty rows array clears every row strictly older than p_computed_at ────────────────────
SELECT lives_ok(
  $$ SELECT public._rebuild_player_ratings('[]'::jsonb, now()) $$,
  '4. calling with an empty rows array does not error'
);
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.player_ratings
     WHERE group_id = '00000000-0000-4000-8000-000000005701' $$,
  $$ VALUES (0) $$,
  '5. the pre-existing stale row was pruned by the empty-array call'
);

-- ── 6-7. Non-empty rows array upserts every row with the call''s stamp ──────────────────────────
SELECT lives_ok(
  $$ SELECT public._rebuild_player_ratings(
       jsonb_build_array(
         jsonb_build_object(
           'group_id', '00000000-0000-4000-8000-000000005702',
           'user_id', '00000000-0000-4000-8000-000000005711',
           'rating', 1510, 'decisions', 25, 'decisions_to_qualify', 0, 'season_delta', 3
         ),
         jsonb_build_object(
           'group_id', '00000000-0000-4000-8000-000000005702',
           'user_id', '00000000-0000-4000-8000-000000005712',
           'rating', NULL, 'decisions', 5, 'decisions_to_qualify', 15, 'season_delta', NULL
         )
       ),
       '2026-01-01T00:00:00Z'::timestamptz
     ) $$,
  '6. calling with two rows does not error'
);
SELECT results_eq(
  $$ SELECT user_id, rating, decisions, decisions_to_qualify, season_delta
     FROM public.player_ratings
     WHERE group_id = '00000000-0000-4000-8000-000000005702'
     ORDER BY user_id $$,
  $$ VALUES
       ('00000000-0000-4000-8000-000000005711'::uuid, 1510, 25, 0, 3),
       ('00000000-0000-4000-8000-000000005712'::uuid, NULL, 5, 15, NULL) $$,
  '7. both rows were upserted with the values passed in'
);

-- ── 8-9. A conflicting (group_id, user_id) is updated in place, not duplicated ──────────────────
SELECT lives_ok(
  $$ SELECT public._rebuild_player_ratings(
       jsonb_build_array(
         jsonb_build_object(
           'group_id', '00000000-0000-4000-8000-000000005702',
           'user_id', '00000000-0000-4000-8000-000000005711',
           'rating', 1522, 'decisions', 30, 'decisions_to_qualify', 0, 'season_delta', 8
         )
       ),
       '2026-01-02T00:00:00Z'::timestamptz
     ) $$,
  '8. re-running with one of the two prior rows does not error'
);
SELECT results_eq(
  $$ SELECT user_id, rating, decisions FROM public.player_ratings
     WHERE group_id = '00000000-0000-4000-8000-000000005702'
     ORDER BY user_id $$,
  $$ VALUES ('00000000-0000-4000-8000-000000005711'::uuid, 1522, 30) $$,
  '9. the re-run upserted the surviving row in place and pruned the row that fell out (no dup)'
);

-- ── 10-11. Rows written by an in-flight run with a NEWER stamp are never pruned by an OLDER run's
--    `lt` bound -- the exact scenario #622 fixed and #619 makes structurally impossible by holding
--    an advisory lock for the whole call, but the `lt` (never `!=`) bound is kept as defense in
--    depth (see the function source). Simulate the "peer already wrote a fresher stamp" case by
--    calling with an OLDER p_computed_at than the row already in the table.
SELECT lives_ok(
  $$ SELECT public._rebuild_player_ratings('[]'::jsonb, '2025-01-01T00:00:00Z'::timestamptz) $$,
  '10. calling with a p_computed_at OLDER than an existing row does not error'
);
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.player_ratings
     WHERE group_id = '00000000-0000-4000-8000-000000005702' $$,
  $$ VALUES (1) $$,
  '11. the existing (newer-stamped) row survives an older-stamped call''s prune'
);

SELECT * FROM finish();
ROLLBACK;
