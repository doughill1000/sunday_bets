create or replace function public.resolve_missed_penalty_for_game(p_game_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select coalesce(w.missed_pick_penalty, s.missed_pick_penalty, st.missed_pick_penalty, -1)
  from public.games g
  join public.weeks   w  on w.id = g.week_id
  join public.seasons s  on s.id = w.season_id
  cross join public.settings st
  where g.id = p_game_id
  limit 1
$$;
