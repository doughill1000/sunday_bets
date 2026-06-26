-- RLS helper, emitted in the schemas phase (see 0050_is_member.sql) so the inline
-- settings / audit_log policies resolve during a from-empty apply.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- Reachable by `authenticated` via RLS policies on settings / audit_log / cron_run_log;
-- the caller needs EXECUTE even though only admins pass the check inside. The closed-by-
-- default baseline (ADR-0011) revokes PUBLIC, so this grant is the sole path.
grant execute on function public.is_admin() to authenticated, service_role;
