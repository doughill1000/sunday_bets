-- rename_group: commissioner renames their group (ADR-0006, dec. 4).
--
-- Enforces the same name constraints as create_group. Runs as SECURITY DEFINER so
-- it can bypass the no-client-update RLS policy on groups; the commissioner check
-- is the trust boundary.
--
-- Error codes:
--   P0001  not authenticated
--   P0010  group name is required
--   P0011  group name too long
--   P0020  caller is not a commissioner of the group
create or replace function public.rename_group(p_group_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_name      text;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Validate name (mirrors create_group + 0221_groups_name_length.sql constraint).
  v_name := btrim(coalesce(p_name, ''));
  if length(v_name) = 0 then
    raise exception 'group name is required' using errcode = 'P0010';
  end if;
  if length(v_name) > 60 then
    raise exception 'group name too long' using errcode = 'P0011';
  end if;

  -- Caller must be a commissioner of this group.
  if not public.is_commissioner(p_group_id) then
    raise exception 'caller is not a commissioner of this group' using errcode = 'P0020';
  end if;

  update public.groups
  set name = v_name
  where id = p_group_id;
end;
$$;

revoke execute on function public.rename_group(uuid, text) from public, anon;
