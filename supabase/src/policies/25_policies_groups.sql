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

-- No direct client INSERT into group_memberships. The prior member-scoped policy
-- only checked is_member(group_id), not user_id = auth.uid(), so any member could
-- insert a membership row for an arbitrary user_id. No client path needs this:
-- create_group / redeem_invite are SECURITY DEFINER and addGroupMember uses the
-- service role. Mirror groups/group_config (no-client-write); all membership writes
-- flow through SECURITY DEFINER RPCs / service role (ADR-0006).
drop policy if exists ins_group_memberships_member on public.group_memberships;
drop policy if exists ins_group_memberships_no_client on public.group_memberships;
create policy ins_group_memberships_no_client
  on public.group_memberships for insert
  to authenticated
  with check (false);

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
