create or replace function public.grade_week(p_week_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_ids uuid[];
begin
  -- Collect all final games for the week
  select array_agg(id)
  into v_game_ids
  from public.games
  where week_id = p_week_id
    and (final_scores->>'home') is not null;

  -- Call the core grading function with the collected game IDs
  if array_length(v_game_ids, 1) > 0 then
    perform public._grade_games_by_ids(v_game_ids);
  end if;
end;
$$;