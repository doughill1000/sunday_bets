-- Odds sync helper: finds a game by the unordered team pair within a week,
-- attaches external_game_id if currently NULL, and returns the game's uuid.
-- Returns NULL when no matching matchup exists — caller should skip and report.
-- Never flips home/away; the schedule source is canonical for home/away.
create or replace function public.attach_line_to_matchup(
  p_week_id          int,
  p_home_team_id     int,
  p_away_team_id     int,
  p_external_game_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Match on the unordered team pair so a home/away disagreement between
  -- providers does not create a duplicate or silently miss the game.
  select id into v_id
  from public.games
  where week_id = p_week_id
    and (
      (home_team_id = p_home_team_id and away_team_id = p_away_team_id)
      or
      (home_team_id = p_away_team_id and away_team_id = p_home_team_id)
    )
  limit 1;

  if v_id is null then
    return null;
  end if;

  -- Set external_game_id only when not yet claimed; never overwrite.
  update public.games
  set external_game_id = p_external_game_id
  where id = v_id
    and external_game_id is null;

  return v_id;
end
$$;

grant execute on function public.attach_line_to_matchup(int,int,int,text)
  to authenticated, service_role;
