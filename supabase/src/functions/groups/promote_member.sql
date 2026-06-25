-- promote_member: commissioner promotes a plain member to commissioner (ADR-0006, dec. 4 + 5).
--
-- A group may have multiple commissioners. Promoting a member is the only way
-- to satisfy the last-commissioner guard before a commissioner leaves or is removed.
--
-- Error codes:
--   P0001  not authenticated
--   P0020  caller is not a commissioner of the group
--   P0021  target user is not a member of this group
--   P0024  target user is already a commissioner
create or replace function public.promote_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id   uuid;
  v_target_role public.group_membership_role;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Caller must be a commissioner of this group.
  if not public.is_commissioner(p_group_id) then
    raise exception 'caller is not a commissioner of this group' using errcode = 'P0020';
  end if;

  -- Target must be a member.
  select role into v_target_role
  from public.group_memberships
  where group_id = p_group_id and user_id = p_user_id;

  if not found then
    raise exception 'target user is not a member of this group' using errcode = 'P0021';
  end if;

  if v_target_role = 'commissioner' then
    raise exception 'target user is already a commissioner' using errcode = 'P0024';
  end if;

  update public.group_memberships
  set role = 'commissioner'
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.promote_member(uuid, uuid) from public, anon;
