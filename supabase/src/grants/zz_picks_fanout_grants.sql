-- Grants for the global-picks write-time fan-out (issue #214).
--
-- These intentionally live OUTSIDE player_grants.sql. That file opens with a
-- blanket `revoke execute on all functions in schema public from authenticated`,
-- so any migration that re-emits player_grants.sql in isolation strips EXECUTE on
-- every function not re-listed there (the commissioner RPCs in zz_group_grants.sql
-- are the cautionary example). Keeping these grants in a separate `zz_`-prefixed
-- file means a fan-out change never has to touch player_grants.sql, and the `zz_`
-- prefix guarantees this file runs AFTER player_grants.sql in a full db:reset so
-- the blanket revoke can't strip what we grant here.

-- DELETE on picks: unlock_pick_all_groups is SECURITY INVOKER, so the caller's role
-- (authenticated) must hold DELETE for the del_picks_own_pre RLS policy to apply.
-- (player_grants.sql grants SELECT/INSERT/UPDATE; DELETE is added here.)
grant delete on public.picks to authenticated;

-- Fan-out RPCs: SECURITY INVOKER, so RLS enforces per-group write permission.
grant execute on function public.lock_pick_all_groups(uuid, public.side_enum, public.weight_enum)
  to authenticated, service_role;
grant execute on function public.unlock_pick_all_groups(uuid)
  to authenticated, service_role;

-- audit_log_action is SECURITY DEFINER but is CALLED by unlock_pick_all_groups while
-- it runs as authenticated (INVOKER), so authenticated needs EXECUTE on it. The old
-- unlock_pick is SECURITY DEFINER and never needed this; the fan-out variant does.
grant execute on function public.audit_log_action(uuid, text, jsonb)
  to authenticated, service_role;
