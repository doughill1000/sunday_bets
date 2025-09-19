create or replace function public.set_active_line(
  p_game_id uuid,
  p_source text,
  p_spread_team_id int,
  p_spread_value numeric
) returns table (id int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id int;
begin
  -- Deactivate the current active tick (if any)
  update public.game_lines
     set is_active_line = false
   where game_id = p_game_id
     and source  = p_source
     and is_active_line = true;

  -- Insert new active tick (history preserved)
  insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line)
  values (p_game_id, p_source, p_spread_team_id, p_spread_value, true)
  returning game_lines.id into v_id;

  return query select v_id;
end
$$;

revoke all on function public.set_active_line(uuid, text, int, numeric) from public;
grant execute on function public.set_active_line(uuid, text, int, numeric)
  to authenticated, service_role;
