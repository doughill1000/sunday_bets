-- group_config: members read their own group's config; no client writes.
drop policy if exists sel_group_config_member on public.group_config;
create policy sel_group_config_member
  on public.group_config for select
  to authenticated
  using (public.is_member(group_id));

drop policy if exists ins_group_config_no_client on public.group_config;
create policy ins_group_config_no_client
  on public.group_config for insert
  to authenticated
  with check (false);

drop policy if exists upd_group_config_no_client on public.group_config;
create policy upd_group_config_no_client
  on public.group_config for update
  to authenticated
  using (false)
  with check (false);

-- group_week_overrides: members read their own group's overrides; no client writes.
drop policy if exists sel_group_week_overrides_member on public.group_week_overrides;
create policy sel_group_week_overrides_member
  on public.group_week_overrides for select
  to authenticated
  using (public.is_member(group_id));

drop policy if exists ins_group_week_overrides_no_client on public.group_week_overrides;
create policy ins_group_week_overrides_no_client
  on public.group_week_overrides for insert
  to authenticated
  with check (false);

drop policy if exists upd_group_week_overrides_no_client on public.group_week_overrides;
create policy upd_group_week_overrides_no_client
  on public.group_week_overrides for update
  to authenticated
  using (false)
  with check (false);
