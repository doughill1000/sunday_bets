drop policy if exists sel_groups_member on public.groups;
create policy sel_groups_member
  on public.groups for select
  to authenticated
  using (public.is_member(id));

drop policy if exists ins_groups_no_client on public.groups;
create policy ins_groups_no_client
  on public.groups for insert
  to authenticated
  with check (false);

drop policy if exists upd_groups_no_client on public.groups;
create policy upd_groups_no_client
  on public.groups for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists sel_group_memberships_member on public.group_memberships;
create policy sel_group_memberships_member
  on public.group_memberships for select
  to authenticated
  using (public.is_member(group_id));

drop policy if exists ins_group_memberships_member on public.group_memberships;
create policy ins_group_memberships_member
  on public.group_memberships for insert
  to authenticated
  with check (public.is_member(group_id) and role = 'member');

drop policy if exists upd_group_memberships_self_member on public.group_memberships;
create policy upd_group_memberships_self_member
  on public.group_memberships for update
  to authenticated
  using (public.is_member(group_id) and user_id = (select auth.uid()))
  with check (
    public.is_member(group_id)
    and user_id = (select auth.uid())
    and role = 'member'
  );
