-- update_recap_opt_out: player toggles their own AI recap opt-out (ADR-0008, dec. 4).
--
-- Writes group_memberships.ai_recap_opt_out for the calling user in the given group.
-- When true the player appears only as neutral facts in the AI-generated recap.
--
-- Runs as SECURITY DEFINER to bypass the RLS with_check constraint on
-- group_memberships that prevents commissioners (role ≠ 'member') from updating
-- their own row. The user_id = auth.uid() guard is the trust boundary.
--
-- Error codes:
--   P0001  not authenticated
--   P0010  caller is not a member of the group
create or replace function public.update_recap_opt_out(
  p_group_id        uuid,
  p_ai_recap_opt_out boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  if not public.is_member(p_group_id) then
    raise exception 'caller is not a member of this group' using errcode = 'P0010';
  end if;

  update public.group_memberships
  set ai_recap_opt_out = p_ai_recap_opt_out
  where group_id = p_group_id
    and user_id  = v_caller;
end;
$$;

revoke execute on function public.update_recap_opt_out(uuid, boolean) from public, anon;
