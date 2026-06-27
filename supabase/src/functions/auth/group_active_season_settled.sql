-- group_active_season_settled: true when the group has at least one settled pick
-- in the active (max-year) season. Used to enforce the ADR-0007 grading-preset
-- season freeze: the preset may only change while a group has no settled games in
-- the active season. Shared by update_group_config (the write guard) and the group
-- page load (to disable the preset selector in the UI).
--
-- Active season = max(seasons.year); there is no is_active flag
-- (see supabase/src/views/current_season_year.sql).
create or replace function public.group_active_season_settled(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.pick_settlement ps
    join public.games   g on g.id = ps.game_id
    join public.weeks   w on w.id = g.week_id
    join public.seasons s on s.id = w.season_id
    where ps.group_id = p_group_id
      and s.year = (select max(year) from public.seasons)
  );
$$;

revoke execute on function public.group_active_season_settled(uuid) from public, anon;
