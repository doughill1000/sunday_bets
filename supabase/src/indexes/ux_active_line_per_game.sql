create unique index if not exists ux_active_line_per_game
on public.game_lines (game_id)
where is_active_line = true;