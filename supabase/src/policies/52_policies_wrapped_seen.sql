-- wrapped_seen: owners manage only their own rows (mirrors recap_seen in
-- 51_policies_recap_seen.sql).

drop policy if exists sel_own_wrapped_seen on public.wrapped_seen;
create policy sel_own_wrapped_seen
  on public.wrapped_seen for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists ins_own_wrapped_seen on public.wrapped_seen;
create policy ins_own_wrapped_seen
  on public.wrapped_seen for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_member(group_id));

drop policy if exists upd_own_wrapped_seen on public.wrapped_seen;
create policy upd_own_wrapped_seen
  on public.wrapped_seen for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
