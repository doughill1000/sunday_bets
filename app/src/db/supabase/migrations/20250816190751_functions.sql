
-- Admin via JWT claim: app_metadata.role = 'admin'
create or replace function public.is_admin()
returns boolean
language sql stable as $$
  select coalesce(
    (jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb, 'role') = 'admin'),
    false
  );
$$;

-- Has the game started? (drives reveal & write locks)
create or replace function public.game_has_started(p_game_id uuid)
returns boolean language sql stable as $$
  select g.status in ('in_progress','final') from public.games g where g.id = p_game_id;
$$;

-- Get current active line for a game
create or replace function public.current_active_line(p_game_id uuid)
returns public.game_lines language sql stable as $$
  select gl.* from public.game_lines gl
  where gl.game_id = p_game_id and gl.is_active_line = true
  order by gl.fetched_at desc
  limit 1;
$$;
