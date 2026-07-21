-- Flags the closing line (latest pre-kickoff row per game+source) write-once.
-- Called at the start of _grade_games_by_ids; skips any (game, source) already flagged.
--
-- Capture only ever runs on the grade path, so it reaches a game exactly once -- at its
-- first grade -- and never revisits one already graded. That is what left 2025 flagged
-- 16/272 (#735): this function shipped with #177 on 2026-06-26, months after the season
-- finished grading, so 255 games were already past the only moment it could have fired.
-- Nothing here was wrong; the gap was closed by a one-off backfill calling this function
-- over those games. Any future mid-season change to the capture rule needs the same
-- treatment -- re-grading is not a path that re-captures.
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
