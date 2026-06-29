-- season_wrapped: group members read their own group's rows; no client writes (service role only).
-- ADR-0002 (group tenancy boundary) + ADR-0008 (AI output is group-scoped).

drop policy if exists sel_season_wrapped_member on public.season_wrapped;
create policy sel_season_wrapped_member
  on public.season_wrapped for select
  to authenticated
  using (public.is_member(group_id));

drop policy if exists ins_season_wrapped_no_client on public.season_wrapped;
create policy ins_season_wrapped_no_client
  on public.season_wrapped for insert
  to authenticated
  with check (false);

drop policy if exists upd_season_wrapped_no_client on public.season_wrapped;
create policy upd_season_wrapped_no_client
  on public.season_wrapped for update
  to authenticated
  using (false)
  with check (false);
