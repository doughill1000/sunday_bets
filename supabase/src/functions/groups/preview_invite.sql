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
  v_comp_start timestamptz;
  v_start_week int;
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

  select name, competition_starts_at into v_group_name, v_comp_start
  from public.groups where id = v_invite.group_id;

  -- The week this invitee would start scoring from (ADR-0037): the first game at or after their
  -- participation start, which for someone joining now is greatest(the league's start, now()).
  -- Drives the "you're in from Week N" onboarding copy. NULL when no eligible game is scheduled
  -- yet (offseason) — the UI falls back to generic copy. Advisory only; grading enforces the
  -- boundary authoritatively.
  select w.week_number into v_start_week
  from public.games g
  join public.weeks w on w.id = g.week_id
  where g.commence_time >= greatest(v_comp_start, now())
  order by g.commence_time asc
  limit 1;

  return jsonb_build_object(
    'status', 'valid',
    'group_name', v_group_name,
    'starts_week_number', v_start_week
  );
end;
$$;

revoke execute on function public.preview_invite(text) from public, anon;
