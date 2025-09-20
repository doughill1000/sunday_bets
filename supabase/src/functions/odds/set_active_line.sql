create or replace function public.set_active_line(
  p_game_id        uuid,
  p_spread_team_id int,
  p_spread_value   numeric,
  p_source         text default 'fanduel'
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with deact as (
    -- Turn off any existing active line for this (game, source)
    update public.game_lines
       set is_active_line = false
     where game_id = p_game_id
       and source  = p_source
       and is_active_line = true
    returning 1
  ),
  upsert as (
    insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
    values (p_game_id, p_source, p_spread_team_id, p_spread_value, true, now())
    on conflict (game_id, source) where is_active_line = true
    do update set
      spread_team_id = excluded.spread_team_id,
      spread_value   = excluded.spread_value,
      fetched_at     = excluded.fetched_at,
      is_active_line = true
    returning *
  )
  select jsonb_build_object(
    'ok',          true,
    'deactivated', coalesce((select count(*) from deact), 0),
    'line',        to_jsonb(upsert.*)
  )
  from upsert;
$$;

grant execute on function public.set_active_line(uuid, int, numeric, text)
  to authenticated, service_role;
