-- update_group_recap_settings: commissioner sets AI recap tone and enable/disable (ADR-0008).
--
-- Two dials, both on group_config:
--   * spice ('mild' | 'medium' | 'spicy') — tone direction fed to the AI prompt.
--   * ai_recaps_enabled (boolean) — when false the grade-cron skips recap generation.
--
-- Runs as SECURITY DEFINER so it can bypass the no-client-update RLS policy on
-- group_config (upd_group_config_no_client); the is_commissioner check is the
-- trust boundary. Nullable params mean "leave unchanged".
--
-- Error codes:
--   P0001  not authenticated
--   P0020  caller is not a commissioner of the group
create or replace function public.update_group_recap_settings(
  p_group_id         uuid,
  p_spice            text    default null,
  p_ai_recaps_enabled boolean default null
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

  update public.group_config
  set spice              = coalesce(p_spice,             spice),
      ai_recaps_enabled  = coalesce(p_ai_recaps_enabled, ai_recaps_enabled),
      updated_at         = now()
  where group_id = p_group_id;
end;
$$;

revoke execute on function public.update_group_recap_settings(uuid, text, boolean) from public, anon;
