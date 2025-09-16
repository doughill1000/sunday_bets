create or replace function public.resolve_missed_penalty_for_game(p_game_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  -- Return a negative penalty based solely on settings.
  -- If the settings row is missing or the value is null, default to 1.
  select -abs(
    coalesce(
      (select missed_pick_penalty from public.settings where id = true),
      1
    )
  )
$$;
