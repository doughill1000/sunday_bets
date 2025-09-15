create or replace function public.grade_season(p_season_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_ids uuid[];
begin
  -- Collect all final games for the season
  select array_agg(g.id)
  into v_game_ids
  from public.weeks w
  join public.games g on g.week_id = w.id
  where w.season_id = p_season_id
    and (g.final_scores->>'home') is not null;

  -- Call the core grading function with the collected game IDs
  if array_length(v_game_ids, 1) > 0 then
    perform public._grade_games_by_ids(v_game_ids);
  end if;
end;
$$;