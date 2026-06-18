-- Settings & audit: admin-only (via public.is_admin())

drop policy if exists admin_sel_settings on public.settings;
create policy admin_sel_settings
  on public.settings for select
  to authenticated
  using (public.is_admin());

drop policy if exists admin_all_settings on public.settings;
create policy admin_all_settings
  on public.settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_sel_audit on public.audit_log;
create policy admin_sel_audit
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

drop policy if exists admin_ins_audit on public.audit_log;
create policy admin_ins_audit
  on public.audit_log for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists admin_sel_cron_run_log on public.cron_run_log;
create policy admin_sel_cron_run_log
  on public.cron_run_log for select
  to authenticated
  using (public.is_admin());
