-- remove_member: commissioner removes another member from their group (ADR-0006, dec. 4 + 5).
--
-- Last-commissioner guard: if the target member is a commissioner AND they are
-- the ONLY commissioner, the removal is blocked — another commissioner must be
-- promoted first.
--
-- Error codes:
--   P0001  not authenticated
--   P0020  caller is not a commissioner of the group
--   P0021  target user is not a member of this group
--   P0022  cannot remove the last commissioner (promote another first)
--   P0023  cannot remove yourself via this call (use leave_group)
create or replace function public.remove_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id     uuid;
  v_target_role   public.group_membership_role;
  v_commissioner_count integer;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Caller must not be removing themselves via this call.
  if v_caller_id = p_user_id then
    raise exception 'cannot remove yourself; use leave_group instead' using errcode = 'P0023';
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

  -- Last-commissioner guard: if target is a commissioner, ensure another exists.
  if v_target_role = 'commissioner' then
    select count(*) into v_commissioner_count
    from public.group_memberships
    where group_id = p_group_id and role = 'commissioner';

    if v_commissioner_count <= 1 then
      raise exception 'cannot remove the last commissioner; promote another member first'
        using errcode = 'P0022';
    end if;
  end if;

  delete from public.group_memberships
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public, anon;
