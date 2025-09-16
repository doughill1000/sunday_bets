create or replace function public.grade_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure the game has scores before proceeding
  if not exists (
    select 1 from public.games
    where id = p_game_id and (final_scores->>'home') is not null
  ) then
    raise exception 'grade_game: game % has no final scores', p_game_id;
  end if;

  -- Call the core grading function with a single game ID
  perform public._grade_games_by_ids(array[p_game_id]);
end;
$$;