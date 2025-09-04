-- Recreate the trigger function without FOR UPDATE
create or replace function public.fn_picks_lock_guard()
returns trigger
language plpgsql
security definer               -- so it runs with the function owner’s privileges
set search_path = public
as $$
declare
  line public.game_lines;
  g    public.games;
begin
  -- Read the game row (no row lock)
  select * into g
  from public.games
  where id = coalesce(new.game_id, old.game_id);

  -- Block edits after kickoff (scheduled | in_progress | final)
  if g.status in ('in_progress','final') then
    raise exception 'Edits are not allowed after kickoff';
  end if;

  -- Require an active line snapshot
  select * into line from public.current_active_line(g.id);
  if line.id is null then
    raise exception 'No active line available for this game';
  end if;

  if (tg_op = 'INSERT') then
    new.initial_locked_at := now();
    new.final_locked_at   := new.initial_locked_at;

    new.initial_locked_line_id        := line.id;
    new.initial_locked_spread_team_id := line.spread_team_id;
    new.initial_locked_spread_value   := line.spread_value;

    new.final_locked_line_id        := line.id;
    new.final_locked_spread_team_id := line.spread_team_id;
    new.final_locked_spread_value   := line.spread_value;

    return new;

  elsif (tg_op = 'UPDATE') then
    if old.relock_used then
      raise exception 'Relock already used for this game';
    end if;

    -- Only count as relock if something changed
    if (new.picked_team_id is distinct from old.picked_team_id)
       or (new.weight is distinct from old.weight) then

      new.final_locked_at := now();
      new.final_locked_line_id        := line.id;
      new.final_locked_spread_team_id := line.spread_team_id;
      new.final_locked_spread_value   := line.spread_value;
      new.relock_used := true;
    end if;

    return new;
  end if;

  return new;
end
$$;

-- trigger already exists; no need to drop/recreate it if the name is the same,
-- but if you want to be explicit:
drop trigger if exists trg_picks_lock_guard on public.picks;
create trigger trg_picks_lock_guard
before insert or update on public.picks
for each row execute function public.fn_picks_lock_guard();
