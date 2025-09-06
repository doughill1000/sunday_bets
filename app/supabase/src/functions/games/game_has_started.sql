-- Helper: has the game started?
create or replace function public.game_has_started(p_game_id uuid)
returns boolean
language sql
stable
as $$
  select (now() >= g.commence_time) from public.games g where g.id = p_game_id
$$;