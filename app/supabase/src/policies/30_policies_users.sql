-- Users: everyone can read; each user may update their own display_name

drop policy if exists sel_users on public.users;
create policy sel_users
  on public.users for select
  to authenticated
  using (true);

drop policy if exists upd_users_self on public.users;
create policy upd_users_self
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
