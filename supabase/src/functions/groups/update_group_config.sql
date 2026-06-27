-- update_group_config: commissioner edits per-group league rules (issue #154).
--
-- Two dials, both on group_config:
--   * grading_preset ('house' | 'gamer') — fairness. Frozen per season (ADR-0007):
--     changeable only while the active season has no settled games for this group.
--   * scoring_rules.drop_worst_week (boolean) — forgiveness. Freely editable.
--
-- Runs as SECURITY DEFINER so it can bypass the no-client-update RLS policy on
-- group_config (upd_group_config_no_client); the is_commissioner check is the
-- trust boundary. Nullable params mean "leave unchanged"; the UI sends the full
-- desired state of both fields.
--
-- Error codes:
--   P0001  not authenticated
--   P0020  caller is not a commissioner of the group
--   P0030  grading preset is frozen (active season already has settled games)
create or replace function public.update_group_config(
  p_group_id uuid,
  p_grading_preset text default null,
  p_drop_worst_week boolean default null
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

  if not public.is_commissioner(p_group_id) then
    raise exception 'caller is not a commissioner of this group' using errcode = 'P0020';
  end if;

  -- ADR-0007: grading_preset is frozen once the active season has settled games,
  -- but only block a *real* change. A no-op re-submit of the same preset is always
  -- allowed (the UI sends both fields every save).
  if p_grading_preset is not null
     and p_grading_preset is distinct from
         (select grading_preset from public.group_config where group_id = p_group_id)
     and public.group_active_season_settled(p_group_id) then
    raise exception 'grading preset cannot change after the season has started'
      using errcode = 'P0030';
  end if;

  update public.group_config
  set grading_preset = coalesce(p_grading_preset, grading_preset),
      scoring_rules  = case
                         when p_drop_worst_week is not null
                           then scoring_rules || jsonb_build_object('drop_worst_week', p_drop_worst_week)
                         else scoring_rules
                       end,
      updated_at     = now()
  where group_id = p_group_id;
end;
$$;

revoke execute on function public.update_group_config(uuid, text, boolean) from public, anon;
