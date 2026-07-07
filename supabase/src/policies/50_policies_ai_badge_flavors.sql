-- ai_badge_flavors: group members read their own group's rows; no client writes (service role only).
-- ADR-0002 (group tenancy boundary) + ADR-0008 (AI output is group-scoped).

drop policy if exists sel_ai_badge_flavors_member on public.ai_badge_flavors;
create policy sel_ai_badge_flavors_member
  on public.ai_badge_flavors for select
  to authenticated
  using (public.is_member(group_id));

drop policy if exists ins_ai_badge_flavors_no_client on public.ai_badge_flavors;
create policy ins_ai_badge_flavors_no_client
  on public.ai_badge_flavors for insert
  to authenticated
  with check (false);

drop policy if exists upd_ai_badge_flavors_no_client on public.ai_badge_flavors;
create policy upd_ai_badge_flavors_no_client
  on public.ai_badge_flavors for update
  to authenticated
  using (false)
  with check (false);
