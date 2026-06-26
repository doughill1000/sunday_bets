create or replace function public.lock_pick_all_groups(
  p_game_id  uuid,
  p_side     public.side_enum,
  p_weight   public.weight_enum
)
returns table (
  group_id   uuid,
  ok         boolean,
  reason     text,
  locked_at  timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid              uuid := auth.uid();
  v_game             public.games%rowtype;
  v_team_id          int;
  v_weeknum          int;
  v_season           int;
  v_lastwk           int;
  v_final_week_allin boolean;
  v_now              timestamptz := now();

  v_membership       record;
  v_line_source      text;
  v_line_id          int;
  v_spread_team_id   int;
  v_spread_value     numeric;
  v_row              public.picks%rowtype;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;

  if p_side not in ('home', 'away') then
    raise exception 'invalid side' using errcode = 'P0001';
  end if;

  -- fetch game once (shared across all groups)
  select * into v_game
  from public.games
  where id = p_game_id;

  if not found then
    raise exception 'game not found' using errcode = 'P0001';
  end if;

  -- reject edits after kickoff for the whole call
  if v_now >= v_game.commence_time then
    raise exception 'edits are not allowed after kickoff' using errcode = 'P0001';
  end if;

  v_team_id := case when p_side = 'home' then v_game.home_team_id else v_game.away_team_id end;

  -- week/season/final-week flag shared across all groups
  select w.week_number, w.season_id into v_weeknum, v_season
  from public.weeks w
  where w.id = v_game.week_id;

  select max(week_number) into v_lastwk
  from public.weeks
  where season_id = v_season;

  v_final_week_allin := public._get_final_week_unlimited_allin();

  -- fan-out: one pick per active membership, skipping groups that fail individually
  for v_membership in
    select gm.group_id
    from public.group_memberships gm
    where gm.user_id = v_uid
      and gm.status  = 'active'
    order by gm.joined_at, gm.group_id
  loop
    begin
      -- resolve this group's line_source (defaults to 'fanduel' when not configured)
      select coalesce(gc.line_source, 'fanduel') into v_line_source
      from public.group_config gc
      where gc.group_id = v_membership.group_id;

      if not found then
        v_line_source := 'fanduel';
      end if;

      -- per-group All-In enforcement (mirrors lock_pick.sql:70-93)
      if p_weight = 'A' and not (v_weeknum = v_lastwk and v_final_week_allin) then
        if exists (
          select 1
          from public.picks p
          join public.games g2 on g2.id = p.game_id
          where p.group_id  = v_membership.group_id
            and p.user_id   = v_uid
            and g2.week_id  = v_game.week_id
            and p.weight    = 'A'
            and p.game_id  <> p_game_id
        ) then
          raise exception 'all in already used this week' using errcode = 'P0001';
        end if;
      end if;

      -- active line snapshot for this group's source (mirrors lock_pick.sql:96-108)
      select gl.id, gl.spread_team_id, gl.spread_value
        into v_line_id, v_spread_team_id, v_spread_value
      from public.game_lines gl
      where gl.game_id        = v_game.id
        and gl.source         = v_line_source
        and gl.is_active_line = true
      order by gl.fetched_at desc, gl.id desc
      limit 1;

      if not found then
        raise exception 'no active line for game % (source=%)', p_game_id, v_line_source
          using errcode = 'P0001';
      end if;

      -- upsert pick for this group (mirrors lock_pick.sql:110-130)
      with upsert as (
        insert into public.picks (
          group_id, user_id, game_id, picked_team_id, weight,
          locked_at, locked_by, locked_line_id, locked_spread_team_id, locked_spread_value
        )
        values (
          v_membership.group_id, v_uid, v_game.id, v_team_id, p_weight,
          v_now, v_uid, v_line_id, v_spread_team_id, v_spread_value
        )
        on conflict (group_id, user_id, game_id) do update
          set picked_team_id        = excluded.picked_team_id,
              weight                = excluded.weight,
              locked_at             = excluded.locked_at,
              locked_by             = excluded.locked_by,
              locked_line_id        = excluded.locked_line_id,
              locked_spread_team_id = excluded.locked_spread_team_id,
              locked_spread_value   = excluded.locked_spread_value
        returning *
      )
      select * into v_row from upsert;

      return query select v_membership.group_id, true, null::text, v_row.locked_at;

    exception when others then
      return query select v_membership.group_id, false, sqlerrm, null::timestamptz;
    end;
  end loop;
end
$$;

grant execute on function public.lock_pick_all_groups(uuid, public.side_enum, public.weight_enum)
  to authenticated, service_role;
