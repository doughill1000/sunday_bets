-- Schedule sync writer: creates or updates a game row by the matchup key
-- (week_id, home_team_id, away_team_id).  Provider ids are attributes.
-- Returns the game's uuid — same id for the life of the matchup.
create or replace function public.upsert_game_by_matchup(
  p_week_id          int,
  p_home_team_id     int,
  p_away_team_id     int,
  p_commence         timestamptz,
  p_schedule_game_id text,
  p_status           text default 'scheduled'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.games (
    week_id, home_team_id, away_team_id, commence_time, schedule_game_id, status
  )
  values (
    p_week_id, p_home_team_id, p_away_team_id,
    p_commence, p_schedule_game_id,
    coalesce(p_status, 'scheduled')
  )
  on conflict (week_id, least(home_team_id, away_team_id), greatest(home_team_id, away_team_id))
  do update set
    commence_time    = excluded.commence_time,
    schedule_game_id = excluded.schedule_game_id,
    -- Only advance status; never overwrite a terminal state from schedule sync.
    status           = case
                         when public.games.status in ('final', 'cancelled') then public.games.status
                         else excluded.status
                       end
  returning id into v_id;

  return v_id;
end
$$;

grant execute on function public.upsert_game_by_matchup(int,int,int,timestamptz,text,text)
  to service_role;
