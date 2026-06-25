-- mint_invite: commissioner creates an invite for their group (ADR-0006, dec. 2 + 4).
--
-- Generates a random URL-safe code, inserts the invite row, and returns the code.
-- max_uses = NULL means unlimited uses; expires_at = NULL means no expiry.
--
-- Error codes:
--   P0001  not authenticated
--   P0020  caller is not a commissioner of the group
create or replace function public.mint_invite(
  p_group_id  uuid,
  p_max_uses  integer  default null,
  p_expires_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_code      text;
begin
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  if not public.is_commissioner(p_group_id) then
    raise exception 'caller is not a commissioner of this group' using errcode = 'P0020';
  end if;

  -- Generate a compact URL-safe token using two UUID hex strings (no external deps).
  -- gen_random_uuid() is always available; we combine two and trim to 24 chars.
  v_code := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_code := left(v_code, 24);

  insert into public.group_invites (group_id, created_by, code, max_uses, expires_at)
  values (p_group_id, v_caller_id, v_code, p_max_uses, p_expires_at);

  return v_code;
end;
$$;

revoke execute on function public.mint_invite(uuid, integer, timestamptz) from public, anon;
