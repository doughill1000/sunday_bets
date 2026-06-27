create or replace function public.redeem_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_invite  public.group_invites%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  -- Lock the invite row to prevent concurrent over-limit redemption.
  select * into v_invite
  from public.group_invites
  where code = p_code
  for update;

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invite revoked' using errcode = 'P0003';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = 'P0004';
  end if;

  if v_invite.max_uses is not null and v_invite.used_count >= v_invite.max_uses then
    raise exception 'invite exhausted' using errcode = 'P0005';
  end if;

  -- No-op if the caller is already a member of this group.
  if exists (
    select 1 from public.group_memberships
    where group_id = v_invite.group_id and user_id = v_user_id
  ) then
    return;
  end if;

  -- Soft cap: groups are limited to 50 members.
  if (select count(*) from public.group_memberships where group_id = v_invite.group_id) >= 50 then
    raise exception 'group is full' using errcode = 'P0006';
  end if;

  -- Atomically add membership and increment usage counter.
  insert into public.group_memberships (group_id, user_id, role)
  values (v_invite.group_id, v_user_id, 'member');

  update public.group_invites
  set used_count = used_count + 1
  where id = v_invite.id;
end;
$$;

revoke execute on function public.redeem_invite(text) from public, anon;
