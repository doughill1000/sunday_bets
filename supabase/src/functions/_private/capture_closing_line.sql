-- Flags the closing line (latest pre-kickoff row per game+source) write-once.
-- Called at the start of _grade_games_by_ids; skips any (game, source) already flagged.
create or replace function public._capture_closing_line(p_game_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.game_lines gl set is_closing_line = true
  from (
    select distinct on (l.game_id, l.source) l.id
    from public.game_lines l
    join public.games g on g.id = l.game_id
    where l.game_id = any(p_game_ids)
      and l.fetched_at <= g.commence_time
      and not exists (
        select 1 from public.game_lines c
        where c.game_id = l.game_id and c.source = l.source and c.is_closing_line
      )
    order by l.game_id, l.source, l.fetched_at desc, l.id desc
  ) winner
  where gl.id = winner.id;
end;
$$;
