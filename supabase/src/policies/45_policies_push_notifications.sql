-- push_subscriptions: owners manage only their own rows.
drop policy if exists sel_own_push_subscriptions on public.push_subscriptions;
create policy sel_own_push_subscriptions
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists ins_own_push_subscriptions on public.push_subscriptions;
create policy ins_own_push_subscriptions
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists upd_own_push_subscriptions on public.push_subscriptions;
create policy upd_own_push_subscriptions
  on public.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists del_own_push_subscriptions on public.push_subscriptions;
create policy del_own_push_subscriptions
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- notification_log: owners may read their own rows; all writes go through the
-- service role (which bypasses RLS).
drop policy if exists sel_own_notification_log on public.notification_log;
create policy sel_own_notification_log
  on public.notification_log for select
  to authenticated
  using (user_id = auth.uid());
