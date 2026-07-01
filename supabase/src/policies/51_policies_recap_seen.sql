-- recap_seen: owners manage only their own rows (mirrors push_subscriptions in
-- 45_policies_push_notifications.sql). Insert additionally requires current
-- group membership so a player can't backfill a seen-marker for a group they've
-- left or never joined.

drop policy if exists sel_own_recap_seen on public.recap_seen;
create policy sel_own_recap_seen
  on public.recap_seen for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists ins_own_recap_seen on public.recap_seen;
create policy ins_own_recap_seen
  on public.recap_seen for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_member(group_id));

drop policy if exists upd_own_recap_seen on public.recap_seen;
create policy upd_own_recap_seen
  on public.recap_seen for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
