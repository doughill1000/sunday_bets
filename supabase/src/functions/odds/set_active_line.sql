create or replace function public.set_active_line(
  p_game_id        uuid,
  p_spread_team_id int,
  p_spread_value   numeric,
  p_source         text default 'fanduel'
)
returns jsonb
language sql
security definer
as $$
  with deact as (
    update public.game_lines
       set is_active_line = false
     where game_id = p_game_id
       and source  = p_source
       and is_active_line = true
    returning id
  ),
  ins as (
    insert into public.game_lines(
      game_id, source, spread_team_id, spread_value, is_active_line, fetched_at
    )
    values (p_game_id, p_source, p_spread_team_id, p_spread_value, true, now())
    returning *
  )
  -- Exactly one row comes from ins; build one jsonb object from it
  select jsonb_build_object(
    'ok',          true,
    'deactivated', (select count(*) from deact),
    'line',        to_jsonb(ins.*)
  )
  from ins;
$$;

grant execute on function public.set_active_line(uuid, int, numeric, text)
  to authenticated, service_role;
