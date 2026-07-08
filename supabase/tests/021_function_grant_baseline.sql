-- 021_function_grant_baseline.sql
-- pgTAP authorization matrix for the closed-by-default FUNCTION grant baseline
-- (ADR-0011, rolled out per ADR-0012). Complements 019_authz_matrix.sql (which covers the
-- table / RLS reachability matrix) by asserting the EXECUTE-grant invariants:
--
--   1. No public-schema function grants EXECUTE to PUBLIC (the closure the baseline
--      enforces; PUBLIC is the implicit grant every role -- incl. anon/authenticated --
--      rode before this work).
--   2. anon has zero function surface in public.
--   3. The `_close_new_fn_acl` event trigger (schemas/0000_function_acl_guard.sql) is
--      installed and enabled -- the mechanism that keeps NEW functions closed, since
--      Supabase will not honor a default-privilege revoke of the built-in PUBLIC grant.
--   4/5. Born-closed proof: a function created here is auto-stripped of PUBLIC execute by
--      that trigger (guards against the trigger being dropped/disabled).
--   6. Positive controls: the player/helper RPCs that MUST stay authenticated-executable.
--   7. Negative controls: backend/service-role-only functions must never be client-exec.
--
-- This is the backstop the baseline's header comments reference: if a future migration
-- adds a function and forgets to keep PUBLIC out (or drops the guard), this test fails CI.

BEGIN;

SELECT plan(7);

-- 1. Core invariant: no public function grants EXECUTE to PUBLIC.
SELECT is_empty(
  $$ SELECT p.proname
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND EXISTS (
         SELECT 1 FROM aclexplode(p.proacl) a
         WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
       ) $$,
  'no public-schema function grants EXECUTE to PUBLIC (closed-by-default baseline)'
);

-- 2. anon has no function surface in public (all client RPC access is authenticated-only).
SELECT is_empty(
  $$ SELECT p.proname
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN aclexplode(p.proacl) a ON a.privilege_type = 'EXECUTE'
     JOIN pg_roles r ON r.oid = a.grantee
     WHERE n.nspname = 'public' AND r.rolname = 'anon' $$,
  'no public-schema function is executable by anon'
);

-- 3. The closure mechanism is installed and enabled.
SELECT isnt_empty(
  $$ SELECT 1 FROM pg_event_trigger
     WHERE evtname = '_close_new_fn_acl' AND evtenabled <> 'D' $$,
  'function ACL guard event trigger is installed and enabled'
);

-- 4/5. Born-closed: creating a public function fires the guard, which strips PUBLIC execute.
CREATE FUNCTION public._authz_matrix_probe() RETURNS int LANGUAGE sql AS 'select 1';

SELECT ok(
  NOT has_function_privilege('anon', 'public._authz_matrix_probe()', 'EXECUTE'),
  'a newly created public function is born without anon EXECUTE (guard fired)'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public._authz_matrix_probe()', 'EXECUTE'),
  'a newly created public function is born without authenticated EXECUTE (guard fired)'
);

-- 6. Positive controls: these player/helper RPCs MUST remain executable by authenticated.
-- (Also guards existence: a missing name surfaces here too.)
SELECT is_empty(
  $$ SELECT name
     FROM unnest(ARRAY[
       'is_admin', 'is_member', 'is_commissioner', 'game_has_started',
       '_get_final_week_unlimited_allin', 'lock_pick', 'unlock_pick',
       'lock_pick_all_groups', 'unlock_pick_all_groups', 'create_group',
       'redeem_invite', 'preview_invite', 'leave_group', 'mint_invite'
     ]) AS name
     WHERE NOT EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       JOIN aclexplode(p.proacl) a ON a.privilege_type = 'EXECUTE'
       JOIN pg_roles r ON r.oid = a.grantee
       WHERE n.nspname = 'public' AND p.proname = name AND r.rolname = 'authenticated'
     ) $$,
  'all listed player/helper RPCs remain executable by authenticated'
);

-- 7. Negative controls: backend/service-role-only functions must not be client-executable.
SELECT is_empty(
  $$ SELECT name
     FROM unnest(ARRAY[
       'grade_game', 'grade_week', 'grade_season', 'grade_pick',
       'find_unsettled_weeks',
       'advance_week_if_complete', 'set_active_line', 'attach_line_to_matchup',
       'upsert_game_by_external_id', 'upsert_game_by_matchup', 'weight_points',
       'refresh_leaderboard_stats'
     ]) AS name
     WHERE EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       JOIN aclexplode(p.proacl) a ON a.privilege_type = 'EXECUTE'
       JOIN pg_roles r ON r.oid = a.grantee
       WHERE n.nspname = 'public' AND p.proname = name
         AND r.rolname IN ('anon', 'authenticated')
     ) $$,
  'no backend/service-role-only function is executable by anon or authenticated'
);

SELECT * FROM finish();
ROLLBACK;
