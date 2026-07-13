-- player_ratings (#361, ADR-0032): service-role-only cross-season credibility read model.
--
-- Rebuilt from a pure TS fold after each grade (ADR-0013 recompute contract). NO client access:
-- the schema enables RLS with no policy, and here we strip the default anon/PUBLIC/authenticated
-- ACL that Supabase auto-grants on new public tables (the same revoke-before-grant defense the
-- base tables use in player_grants.sql, but without any follow-on authenticated grant — reads run
-- exclusively through the service-role stats composer, filtered by group_id). service_role keeps
-- full access via admin_grants.sql, whose blanket "on all tables" grant runs earlier in the grants
-- phase and is not touched by this revoke.
revoke all on public.player_ratings from public, anon, authenticated;
