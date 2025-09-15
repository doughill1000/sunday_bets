create or replace function public.resolve_missed_penalty_for_game(p_game_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  -- Single source of truth: global setting
  select st.missed_pick_penalty
  from public.settings st
  limit 1
$$;