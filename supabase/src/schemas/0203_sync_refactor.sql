-- A) Allow history: drop the upsert-style uniqueness on (game_id, source)
alter table public.game_lines
  drop constraint if exists uq_game_lines_game_source;

-- B) Enforce exactly one *active* row per (game, source)
drop index if exists ux_game_lines_active;
create unique index if not exists ux_game_lines_active_per_source
  on public.game_lines (game_id, source)
  where is_active_line = true;
