-- 20xx..._lock_pick_fn.sql
create or replace function public.lock_pick(
  p_game_id uuid,
  p_side text,               -- 'home' | 'away'
  p_weight weight_enum       -- 'L' | 'M' | 'H' | 'A'
)
returns table (
  ok boolean,
  user_id uuid,
  game_id uuid,
  picked_side text,
  weight weight_enum,
  final_locked_at timestamptz,
  relock_used boolean
)
language plpgsql
security invoker                     -- respect caller's RLS
as $$
declare
  v_uid uuid := auth.uid();
  v_game record;
  v_week_id int;
  v_now timestamptz := now() at time zone 'utc';
  v_picked_team_id int;
  v_existing record;
  v_gl record;                       -- active line snapshot
  v_is_last_week boolean := false;   -- tweak if you allow multiple A in last week
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;

  -- game & timing
  select g.*, g.week_id into v_game
  from public.games g
  where g.id = p_game_id;
  if not found then
    raise exception 'game not found' using errcode = 'P0001';
  end if;
  v_week_id := v_game.week_id;

  if v_now >= v_game.commence_time then
    raise exception 'kickoff passed — picks locked' using errcode = 'P0001';
  end if;

  -- map side -> team_id
  if p_side = 'home' then
    v_picked_team_id := v_game.home_team_id;
  elsif p_side = 'away' then
    v_picked_team_id := v_game.away_team_id;
  else
    raise exception 'invalid side' using errcode = 'P0001';
  end if;

  select (max(w.week_number) = v_w.week_number) into v_is_last_week
  from public.weeks w join public.weeks v_w on v_w.id = v_week_id
  where w.season_id = v_w.season_id;

  -- Ace rule: only one A per week (unless last week)
  if p_weight = 'A' and not v_is_last_week then
    if exists (
      select 1
      from public.picks p
      join public.games g2 on g2.id = p.game_id
      where p.user_id = v_uid
        and g2.week_id = v_week_id
        and p.weight = 'A'
        and p.game_id <> p_game_id
    ) then
      raise exception 'Ace already used this week' using errcode = 'P0001';
    end if;
  end if;

  -- active line snapshot (authoritative line)
  select gl.*
  into v_gl
  from public.game_lines gl
  where gl.game_id = p_game_id
    and gl.is_active_line = true
  order by gl.fetched_at desc
  limit 1;

  if not found then
    -- if no line yet, you could allow lock with null snapshot, or abort:
    raise exception 'no active line available for this game' using errcode = 'P0001';
  end if;

  -- existing pick?
  select * into v_existing
  from public.picks
  where user_id = v_uid and game_id = p_game_id
  for update;

  if not found then
    -- first lock
    insert into public.picks (
      user_id, game_id, picked_team_id, weight,
      initial_locked_at, final_locked_at,
      relock_used,
      initial_locked_line_id, initial_locked_spread_team_id, initial_locked_spread_value,
      final_locked_line_id,   final_locked_spread_team_id,   final_locked_spread_value,
      locked_by
    )
    values (
      v_uid, p_game_id, v_picked_team_id, p_weight,
      v_now, v_now,
      false,
      v_gl.id, v_gl.spread_team_id, v_gl.spread_value,
      v_gl.id, v_gl.spread_team_id, v_gl.spread_value,
      v_uid
    );
  else
    -- relock path: only once
    if v_existing.relock_used then
      raise exception 'relock already used' using errcode = 'P0001';
    end if;

    update public.picks
    set picked_team_id = v_picked_team_id,
        weight         = p_weight,
        final_locked_at = v_now,
        relock_used     = true,
        final_locked_line_id         = v_gl.id,
        final_locked_spread_team_id  = v_gl.spread_team_id,
        final_locked_spread_value    = v_gl.spread_value,
        locked_by      = v_uid
    where user_id = v_uid and game_id = p_game_id;
  end if;

  -- return a compact row for UI
  return query
  select
    true as ok,
    v_uid as user_id,
    p_game_id as game_id,
    p_side as picked_side,
    p_weight as weight,
    (select final_locked_at from public.picks where user_id = v_uid and game_id = p_game_id) as final_locked_at,
    (select relock_used from public.picks where user_id = v_uid and game_id = p_game_id) as relock_used;

end
$$;

grant execute on function public.lock_pick(uuid, text, weight_enum) to authenticated;
