create or replace function public.lock_pick(
  p_game_id  uuid,
  p_side     text,         -- 'home' | 'away'
  p_weight   weight_enum   -- 'L' | 'M' | 'H' | 'A'
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
security invoker
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_game    public.games%rowtype;
  v_team_id bigint;
  v_weeknum int;
  v_season  bigint;
  v_lastwk  int;
  v_line    public.game_lines%rowtype;
  v_row     public.picks%rowtype;
begin
  -- Auth guard
  if v_uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;

  -- Side guard
  if p_side not in ('home','away') then
    raise exception 'invalid side' using errcode = 'P0001';
  end if;

  -- Fetch game
  select * into v_game
  from public.games
  where id = p_game_id;
  if not found then
    raise exception 'game not found' using errcode = 'P0001';
  end if;

  -- Resolve picked team id (BIGINT)
  v_team_id := case when p_side = 'home' then v_game.home_team_id else v_game.away_team_id end;

  -- Week/season lookups for Ace rule
  select w.week_number, w.season_id
    into v_weeknum, v_season
  from public.weeks w
  where w.id = v_game.week_id;

  select max(week_number) into v_lastwk
  from public.weeks
  where season_id = v_season;

  -- Ace rule: only one 'A' per week unless it's the last week
  if p_weight = 'A' and v_weeknum <> v_lastwk then
    if exists (
      select 1
      from public.picks p
      join public.games g2 on g2.id = p.game_id
      where p.user_id = v_uid
        and g2.week_id = v_game.week_id
        and p.weight = 'A'
        and p.game_id <> p_game_id
    ) then
      raise exception 'Ace already used this week' using errcode = 'P0001';
    end if;
  end if;

  -- Require an active line (trigger validates again, but this yields a friendly error)
  select * into v_line from public.current_active_line(v_game.id);
  if v_line.id is null then
    raise exception 'no active line available for this game' using errcode = 'P0001';
  end if;

  -- Upsert the pick. Allow exactly one relock:
  -- If a conflict exists and relock_used = true, the WHERE clause prevents the UPDATE,
  -- so no rows are affected -> raise a clean error.
  with upsert as (
    insert into public.picks (user_id, game_id, picked_team_id, weight)
    values (v_uid, v_game.id, v_team_id, p_weight)
    on conflict (user_id, game_id) do update
      set picked_team_id = excluded.picked_team_id,
          weight         = excluded.weight
      where public.picks.relock_used = false
    returning *
  )
  select * into v_row from upsert;

  if not found then
    -- Conflict existed but relock was already used
    raise exception 'relock already used' using errcode = 'P0001';
  end if;

  -- Return compact payload for the UI
  return query
  select
    true as ok,
    v_row.user_id,
    v_row.game_id,
    p_side as picked_side,
    v_row.weight,
    v_row.final_locked_at,
    v_row.relock_used;
end
$$;

grant execute on function public.lock_pick(uuid, text, weight_enum)
  to authenticated, service_role;
