-- supabase/functions/set_active_line.sql
create or replace function public.set_active_line(
  p_game_id        uuid,
  p_spread_team_id int,
  p_spread_value   numeric,
  p_source         text default 'fanduel'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_home int;
  v_away int;
  v_fav  int;
  v_val  numeric;
begin
  -- who is home/away?
  select home_team_id, away_team_id into v_home, v_away
  from public.games where id = p_game_id;

  -- If caller passed a negative number, flip the team to the actual favorite
  if p_spread_value < 0 then
    v_val := abs(p_spread_value);
    if p_spread_team_id = v_home then
      v_fav := v_away;
    else
      v_fav := v_home;
    end if;
  else
    v_val := p_spread_value;
    v_fav := p_spread_team_id;
  end if;

  -- Deactivate any existing active row for this (game, source)
  update public.game_lines
     set is_active_line = false
   where game_id = p_game_id
     and source  = p_source
     and is_active_line = true;

  -- Upsert the canonical (favorite, positive) line
  insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
  values (p_game_id, p_source, v_fav, v_val, true, now())
  on conflict on constraint ux_game_lines_active_per_source
  do update set
    spread_team_id = excluded.spread_team_id,
    spread_value   = excluded.spread_value,
    fetched_at     = excluded.fetched_at,
    is_active_line = true;

  return jsonb_build_object('ok', true);
end
$$;
