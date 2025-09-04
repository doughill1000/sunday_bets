-- Snapshot the active line + timestamp on every INSERT/UPDATE before kickoff
create or replace function public.fn_picks_lock_guard()
returns trigger
language plpgsql
as $$
declare
  line public.game_lines;
  g    public.games;
begin
  -- Lock the game row to serialize checks
  select * into g
  from public.games
  where id = coalesce(new.game_id, old.game_id)
  for update;

  if now() >= g.commence_time then
    raise exception 'Edits are not allowed after kickoff';
  end if;

  select * into line from public.current_active_line(g.id);
  if line.id is null then
    raise exception 'No active line available for this game';
  end if;

  new.locked_at := now();
  new.locked_line_id := line.id;
  new.locked_spread_team_id := line.spread_team_id;
  new.locked_spread_value := line.spread_value;

  return new;
end;
$$;

drop trigger if exists trg_picks_lock_guard on public.picks;
create trigger trg_picks_lock_guard
before insert or update on public.picks
for each row execute function public.fn_picks_lock_guard();
