create or replace function public.unlock_pick_all_groups(
  p_game_id uuid
)
returns table (
  group_id uuid,
  ok       boolean,
  reason   text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_game public.games%rowtype;
  v_now  timestamptz := now();
  v_row  public.picks%rowtype;

  v_membership record;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;

  -- fetch game (shared kickoff guard)
  select * into v_game
  from public.games
  where id = p_game_id;

  if not found then
    raise exception 'game not found' using errcode = 'P0001';
  end if;

  if game_has_started(p_game_id) or v_now >= v_game.commence_time then
    raise exception 'Edits are not allowed after kickoff' using errcode = 'P0001';
  end if;

  -- fan-out: delete pick in each active group, skip on per-group failure
  for v_membership in
    select gm.group_id
    from public.group_memberships gm
    where gm.user_id = v_uid
      and gm.status  = 'active'
    order by gm.joined_at, gm.group_id
  loop
    begin
      with del as (
        delete from public.picks p
        where p.group_id = v_membership.group_id
          and p.user_id  = v_uid
          and p.game_id  = p_game_id
        returning *
      )
      select * into v_row from del;

      if found then
        perform public.audit_log_action(
          v_uid,
          'unlock_pick_all_groups',
          jsonb_build_object(
            'group_id',              v_membership.group_id,
            'game_id',               p_game_id,
            'picked_team_id',        v_row.picked_team_id,
            'weight',                v_row.weight,
            'locked_at',             v_row.locked_at,
            'locked_line_id',        v_row.locked_line_id,
            'locked_spread_team_id', v_row.locked_spread_team_id,
            'locked_spread_value',   v_row.locked_spread_value
          )
        );
        return query select v_membership.group_id, true, null::text;
      else
        -- no pick to delete in this group; still a success (idempotent)
        return query select v_membership.group_id, true, null::text;
      end if;

    exception when others then
      return query select v_membership.group_id, false, sqlerrm;
    end;
  end loop;
end
$$;

grant execute on function public.unlock_pick_all_groups(uuid)
  to authenticated, service_role;
