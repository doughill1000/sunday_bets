-- leave_group: the calling user leaves the given group (ADR-0006, dec. 5).
--
-- Last-commissioner guard: if the caller is a commissioner and they are the
-- ONLY commissioner of the group, leaving is blocked. Another member must be
-- promoted to commissioner first (transfer-required, not block-only).
--
-- Error codes:
--   P0001  not authenticated
--   P0021  caller is not a member of this group
--   P0022  cannot leave as the last commissioner (promote another first)
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id          uuid;
  v_caller_role        public.group_membership_role;
  v_commissioner_count integer;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Caller must be a member.
  select role into v_caller_role
  from public.group_memberships
  where group_id = p_group_id and user_id = v_caller_id;

  if not found then
    raise exception 'caller is not a member of this group' using errcode = 'P0021';
  end if;

  -- Last-commissioner guard.
  if v_caller_role = 'commissioner' then
    select count(*) into v_commissioner_count
    from public.group_memberships
    where group_id = p_group_id and role = 'commissioner';

    if v_commissioner_count <= 1 then
      raise exception 'cannot leave as the last commissioner; promote another member first'
        using errcode = 'P0022';
    end if;
  end if;

  delete from public.group_memberships
  where group_id = p_group_id and user_id = v_caller_id;
end;
$$;

revoke execute on function public.leave_group(uuid) from public, anon;
