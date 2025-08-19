-- 02_get_active_week_games.sql

drop function if exists public.get_active_week_games();

create or replace function public.get_active_week_games()
returns table (
  game_id uuid,
  external_game_id text,
  kickoff timestamptz,
  home_code text,
  home_name text,
  away_code text,
  away_name text,
  spread_team text,
  spread_value numeric,
  line_source text
)
language plpgsql
stable
as $func$
declare
  v_now  timestamptz := now() at time zone 'utc';
  v_week bigint;
begin
  -- Week that contains "now" (UTC)
  select id into v_week
  from public.weeks
  where start_ts <= v_now and v_now < end_ts
  order by start_ts desc
  limit 1;

  -- Optional fallback: latest started week if none contains now
  if not found then
    select id into v_week
    from public.weeks
    where start_ts <= v_now
    order by start_ts desc
    limit 1;
  end if;

  if v_week is null then
    return;
  end if;

  return query
    select *
    from public.get_games_with_active_lines(v_week);
end
$func$;

grant execute on function public.get_active_week_games() to anon, authenticated;
