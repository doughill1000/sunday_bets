-- Before INSERT/UPDATE on picks:
-- - INSERT (first lock): stamp current active line into initial_* and final_*
-- - UPDATE (relock): allowed only if relock_used=false and game not started;
--   re-stamp final_* and set relock_used=true
create or replace function public.fn_picks_lock_guard()
returns trigger language plpgsql as $$
declare
  line public.game_lines;
  g public.games;
begin
  select * into g from public.games where id = coalesce(new.game_id, old.game_id) for update;
  if now() >= g.commence_time then
    raise exception 'Edits are not allowed after kickoff';
  end if;

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

    -- only count as relock if team or weight actually changes
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
end;
$$;

drop trigger if exists trg_picks_lock_guard on public.picks;
create trigger trg_picks_lock_guard
before insert or update on public.picks
for each row execute function public.fn_picks_lock_guard();
