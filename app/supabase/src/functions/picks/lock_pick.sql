 
create or replace function public.lock_pick(
  p_game_id  uuid,
  p_side     text,         -- 'home' | 'away'
  p_weight   public.weight_enum   -- 'L' | 'M' | 'H' | 'A'
)
returns table (
  ok boolean,
  user_id uuid,
  game_id uuid,
  picked_side text,
  weight public.weight_enum,
  locked_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid     uuid := auth.uid();
  v_game    public.games%rowtype;
  v_team_id int;
  v_weeknum int;
  v_season  int;
  v_lastwk  int;
  v_row     public.picks%rowtype;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;

  if p_side not in ('home','away') then
    raise exception 'invalid side' using errcode = 'P0001';
  end if;

  select * into v_game from public.games where id = p_game_id;
  if not found then
    raise exception 'game not found' using errcode = 'P0001';
  end if;

  if now() >= v_game.commence_time then
    raise exception 'edits are not allowed after kickoff' using errcode = 'P0001';
  end if;

  v_team_id := case when p_side = 'home' then v_game.home_team_id else v_game.away_team_id end;

  -- all in rule: one 'A' per week unless last week
  select w.week_number, w.season_id into v_weeknum, v_season from public.weeks w where w.id = v_game.week_id;
  select max(week_number) into v_lastwk from public.weeks where season_id = v_season;

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
      raise exception 'all in already used this week' using errcode = 'P0001';
    end if;
  end if;

  -- Upsert; BEFORE trigger stamps snapshot
  with upsert as (
    insert into public.picks (user_id, game_id, picked_team_id, weight)
    values (v_uid, v_game.id, v_team_id, p_weight)
    on conflict (user_id, game_id) do update
      set picked_team_id = excluded.picked_team_id,
          weight         = excluded.weight
    returning *
  )
  select * into v_row from upsert;

  return query
  select
    true as ok,
    v_row.user_id,
    v_row.game_id,
    p_side as picked_side,
    v_row.weight,
    v_row.locked_at;
end
$$;

grant execute on function public.lock_pick(uuid, text, public.weight_enum)
  to authenticated, service_role;
