-- RLS helper, emitted in the schemas phase (see 0050_is_member.sql) so the inline
-- picks / comments / reactions policies resolve during a from-empty apply.
-- Helper: has the game started?
create or replace function public.game_has_started(p_game_id uuid)
returns boolean
language sql
stable
as $$
  select (now() >= g.commence_time) from public.games g where g.id = p_game_id
$$;

-- Reachable by `authenticated` via the picks / comments / reactions RLS policies and
-- unlock_pick_all_groups (SECURITY INVOKER); the caller needs EXECUTE. The closed-by-
-- default baseline (ADR-0011) revokes PUBLIC, so this grant is the sole path.
grant execute on function public.game_has_started(uuid)
  to authenticated, service_role;
