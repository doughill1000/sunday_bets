create or replace function public.preview_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_invite  public.group_invites%rowtype;
  v_group_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Read-only preview for the /join/[code] page. Invite SELECT is
  -- commissioner-only under RLS (27_policies_group_invites.sql), so an invitee
  -- cannot see their own invite directly; this SECURITY DEFINER function exposes
  -- only the display state (never the raw row). redeem_invite re-validates
  -- atomically on submit, so this is advisory.
  select * into v_invite
  from public.group_invites
  where code = p_code;

  if not found then
    return jsonb_build_object('status', 'invalid', 'group_name', null);
  end if;

  if v_invite.revoked_at is not null then
    return jsonb_build_object('status', 'revoked', 'group_name', null);
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return jsonb_build_object('status', 'expired', 'group_name', null);
  end if;

  if v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    return jsonb_build_object('status', 'exhausted', 'group_name', null);
  end if;

  if exists (
    select 1 from public.group_memberships
    where group_id = v_invite.group_id and user_id = v_user_id
  ) then
    return jsonb_build_object('status', 'already_member', 'group_name', null);
  end if;

  select name into v_group_name from public.groups where id = v_invite.group_id;

  return jsonb_build_object('status', 'valid', 'group_name', v_group_name);
end;
$$;

revoke execute on function public.preview_invite(text) from public, anon;
