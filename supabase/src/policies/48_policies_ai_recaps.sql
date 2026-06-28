-- ai_recaps: group members read their own group's rows; no client writes (service role only).
-- ADR-0002 (group tenancy boundary) + ADR-0008 (AI output is group-scoped).

drop policy if exists sel_ai_recaps_member on public.ai_recaps;
create policy sel_ai_recaps_member
  on public.ai_recaps for select
  to authenticated
  using (public.is_member(group_id));

drop policy if exists ins_ai_recaps_no_client on public.ai_recaps;
create policy ins_ai_recaps_no_client
  on public.ai_recaps for insert
  to authenticated
  with check (false);

drop policy if exists upd_ai_recaps_no_client on public.ai_recaps;
create policy upd_ai_recaps_no_client
  on public.ai_recaps for update
  to authenticated
  using (false)
  with check (false);
