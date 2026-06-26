-- Function ACL guard for the closed-by-default baseline (paired with 0001_role_baseline).
--
-- Lives in schemas/ (not functions/) and sorts FIRST so the event trigger that invokes it
-- -- created in 0001_role_baseline.sql, still in the schemas phase -- is active before the
-- functions phase creates any application function. That ordering is what lets the
-- from-empty history squash (ADR-0012) end up closed: every app function is created after
-- this guard exists, so each one is stripped of PUBLIC execute as it is created.
--
-- Why a trigger instead of default privileges: PostgreSQL's built-in default grants
-- EXECUTE on every new function to PUBLIC, and in this Supabase setup that built-in grant
-- cannot be subtracted via `alter default privileges ... revoke execute on functions from
-- public` (verified empirically -- an owner-only function default collapses back to the
-- built-in and re-grants PUBLIC). Revoking PUBLIC per-creation is the reliable mechanism.
--
-- SECURITY DEFINER (owned by postgres) so it can always revoke; search_path is pinned
-- empty with catalog objects schema-qualified. The trigger's WHEN clause (in 0001)
-- restricts firing to function-creation events, so the REVOKE below never re-enters it.
-- Only the implicit PUBLIC grant is removed; explicit authenticated/service_role grants
-- a function's own file adds afterward survive. Backstopped by the pgTAP authz matrix
-- (tests/021_function_grant_baseline.sql).
create or replace function public._close_new_fn_acl()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r record;
begin
  for r in
    select object_identity
    from pg_catalog.pg_event_trigger_ddl_commands()
    where schema_name = 'public'
  loop
    execute pg_catalog.format('revoke execute on function %s from public', r.object_identity);
  end loop;
end
$fn$;

comment on function public._close_new_fn_acl() is
  'Closed-by-default baseline (ADR-0011): invoked by the _close_new_fn_acl event trigger '
  'to strip PUBLIC execute from every new public function, because Supabase will not honor '
  'a default-privilege revoke of the built-in grant. Backstopped by pgTAP tests/021.';
