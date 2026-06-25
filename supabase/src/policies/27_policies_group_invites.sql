-- group_invites: commissioner can manage their group's invites; no client-side redemption path.

alter table public.group_invites enable row level security;

drop policy if exists sel_group_invites_commissioner on public.group_invites;
create policy sel_group_invites_commissioner
  on public.group_invites for select
  to authenticated
  using (public.is_commissioner(group_id));

drop policy if exists ins_group_invites_commissioner on public.group_invites;
create policy ins_group_invites_commissioner
  on public.group_invites for insert
  to authenticated
  with check (
    public.is_commissioner(group_id)
    and created_by = (select auth.uid())
  );

drop policy if exists upd_group_invites_commissioner on public.group_invites;
create policy upd_group_invites_commissioner
  on public.group_invites for update
  to authenticated
  using (public.is_commissioner(group_id))
  with check (public.is_commissioner(group_id));

drop policy if exists del_group_invites_no_client on public.group_invites;
create policy del_group_invites_no_client
  on public.group_invites for delete
  to authenticated
  using (false);
