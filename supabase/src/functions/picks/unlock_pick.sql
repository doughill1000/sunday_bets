create or replace function public.unlock_pick(
  p_game_id uuid
)
returns table (
  ok boolean,
  user_id uuid,
  game_id uuid,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_game public.games%rowtype;
  v_row  public.picks%rowtype;
  v_now  timestamptz := now();
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;

  select gm.group_id into v_group_id
  from public.group_memberships gm
  where gm.user_id = v_uid
  order by gm.joined_at, gm.group_id
  limit 1;

  if v_group_id is null then
    raise exception 'group membership not found' using errcode = 'P0001';
  end if;

  -- Serialize against concurrent lock/unlock attempts for the same game
  select * into v_game
  from public.games
  where id = p_game_id
  for update;
  if not found then
    raise exception 'game not found' using errcode = 'P0001';
  end if;

  -- Hybrid guard: status OR scheduled kickoff time
  if game_has_started(p_game_id) or v_now >= v_game.commence_time then
    raise exception 'Edits are not allowed after kickoff' using errcode = 'P0001';
  end if;

  -- Delete the pick (if present)
  with del as (
    delete from public.picks p
    where p.group_id = v_group_id
      and p.user_id = v_uid
      and p.game_id = p_game_id
    returning *
  )
  select * into v_row from del;

  if found then
    perform public.audit_log_action(
      v_uid,
      'unlock_pick',
      jsonb_build_object(
        'game_id', p_game_id,
        'picked_team_id', v_row.picked_team_id,
        'weight', v_row.weight,
        'locked_at', v_row.locked_at,
        'locked_line_id', v_row.locked_line_id,
        'locked_spread_team_id', v_row.locked_spread_team_id,
        'locked_spread_value', v_row.locked_spread_value
      )
    );

    return query select true, v_row.user_id, v_row.game_id, v_now;
  else
    -- Nothing to delete; still record the intent (helps debug queued/offline retries)
    perform public.audit_log_action(
      v_uid,
      'unlock_pick_noop',
      jsonb_build_object('game_id', p_game_id)
    );

    return query select false, v_uid, p_game_id, v_now;
  end if;
end
$$;

revoke all on function public.unlock_pick(uuid) from public;
grant execute on function public.unlock_pick(uuid) to authenticated, service_role;
