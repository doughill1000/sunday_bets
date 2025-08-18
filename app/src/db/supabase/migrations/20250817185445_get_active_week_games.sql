-- 02_get_active_week_games.sql
create or replace function public.get_active_week_games()
returns setof public.get_games_with_active_lines
language plpgsql
stable
as $func$
declare
  w record;
begin
  select id into w
  from public.weeks
  where is_active = true
  limit 1;

  if not found then
    return;
  end if;

  return query
    select * from public.get_games_with_active_lines(w.id);
end
$func$;

grant execute on function public.get_active_week_games()        to anon, authenticated;