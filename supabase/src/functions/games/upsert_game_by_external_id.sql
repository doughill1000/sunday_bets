create or replace function public.upsert_game_by_external_id(
  p_external_game_id text,
  p_week_id int,
  p_commence timestamptz,
  p_home_team_id int,
  p_away_team_id int
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.games (week_id, external_game_id, commence_time, home_team_id, away_team_id, status)
  values (p_week_id, p_external_game_id, p_commence, p_home_team_id, p_away_team_id, 'scheduled')
  on conflict (external_game_id)
  do update set
    week_id = excluded.week_id,
    commence_time = excluded.commence_time,
    home_team_id = excluded.home_team_id,
    away_team_id = excluded.away_team_id
  returning id into v_id;

  return v_id;
end
$$;

grant execute on function public.upsert_game_by_external_id(text,int,timestamptz,int,int)
  to authenticated, service_role;
