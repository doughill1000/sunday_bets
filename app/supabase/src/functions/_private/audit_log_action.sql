create or replace function public.audit_log_action(
  p_actor  uuid,
  p_action text,
  p_details jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_log (actor, action, details)
  values (p_actor, p_action, p_details);
$$;

revoke all on function public.audit_log_action(uuid, text, jsonb) from public;
grant execute on function public.audit_log_action(uuid, text, jsonb)
  to authenticated, service_role;