-- file: supabase/functions/all_in_declarations.sql
--
-- ADR-0023 (All-In as a signature moment): the pre-kickoff declaration surface.
--
-- Returns every locked All-In (weight='A') pick for one group + week to a CALLER
-- who is a member of that group -- including co-members' All-Ins *before* kickoff.
-- This is the narrow, weight='A'-only extension of ADR-0019's sealed-envelope
-- reveal boundary.
--
-- Why a SECURITY DEFINER function and not a base-table RLS SELECT policy: RLS
-- SELECT policies OR-combine, so widening public.picks for weight='A' would leak
-- All-Ins to *every* reader of the table (picks_group_view, admin reads, etc.).
-- This function instead bypasses base-table RLS and re-imposes its own membership
-- + weight gate, so no other picks reader gains visibility and the
-- sel_picks_owner_or_started guarantee for L/M/H picks stays structurally intact.
--
-- is_member(p_group_id) keys off auth.uid() (unaffected by SECURITY DEFINER), so
-- a non-member caller receives zero rows. weight <> 'A' is never returned here.
create or replace function public.all_in_declarations(
  p_group_id uuid,
  p_week_id  integer
)
returns table (
  group_id uuid,
  user_id uuid,
  display_name text,
  avatar_key text,
  game_id uuid,
  week_id integer,
  picked_side public.side_enum,
  weight public.weight_enum,
  picked_team_id integer,
  picked_team_short text,
  locked_at timestamptz,
  commence_time timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.group_id,
    p.user_id,
    u.display_name,
    u.avatar_key,
    p.game_id,
    g.week_id,
    (case
       when p.picked_team_id = g.home_team_id then 'home'
       when p.picked_team_id = g.away_team_id then 'away'
     end)::public.side_enum as picked_side,
    p.weight,
    p.picked_team_id,
    t.short_name as picked_team_short,
    p.locked_at,
    g.commence_time
  from public.picks p
  join public.users u on u.id = p.user_id
  join public.games g on g.id = p.game_id
  join public.teams t on t.id = p.picked_team_id
  where p.group_id = p_group_id
    and g.week_id = p_week_id
    and p.weight = 'A'
    and public.is_member(p_group_id);
$$;

comment on function public.all_in_declarations(uuid, integer) is
  'ADR-0023 All-In declaration surface: returns locked weight=A picks for a group+week to co-members, pre-kickoff included. SECURITY DEFINER + is_member() gate; base-table picks RLS is untouched so no L/M/H pick is revealed pre-kickoff. See docs/adr/0023-all-in-signature-moment.md.';

-- Closed-by-default (ADR-0011): the baseline revokes EXECUTE from PUBLIC; this
-- get-only RPC self-grants in its own source file, per house convention
-- (cf. unlock_pick.sql, set_active_line.sql).
revoke all on function public.all_in_declarations(uuid, integer) from public, anon;
grant execute on function public.all_in_declarations(uuid, integer) to authenticated, service_role;
