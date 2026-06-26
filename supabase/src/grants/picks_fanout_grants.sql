-- Grants for the global-picks write-time fan-out (issue #214).
--
-- These live in their own grants-phase file (rather than in player_grants.sql) so a
-- fan-out change never has to touch the core player grants. Under the closed-by-default
-- baseline (ADR-0011) there is no blanket revoke to outrun, so order among grant files
-- no longer matters -- this file used to be `zz_`-prefixed purely to sort after
-- player_grants.sql; the ADR-0012 rebaseline removed that ordering hack.

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
