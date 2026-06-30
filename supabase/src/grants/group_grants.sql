-- groups / group_memberships: authenticated access is gated by RLS.
-- Strip default public/anon ACLs first so anon has no Data API access.
revoke all on public.groups from public, anon;
revoke all on public.group_memberships from public, anon;

grant select on public.groups to authenticated;
-- SELECT only: all membership writes go through SECURITY DEFINER RPCs / service role.
-- Direct client INSERT is blocked by the no-client-write policy (25_policies_groups.sql).
grant select on public.group_memberships to authenticated;

grant execute on function public.is_member(uuid) to authenticated, service_role;

-- create_group is the only insert path into groups (RLS blocks direct client
-- inserts). It is SECURITY DEFINER and enforces the create-gate internally.
grant execute on function public.create_group(text) to authenticated, service_role;

-- Commissioner management RPCs (ADR-0006, dec. 4 + 5): SECURITY DEFINER, caller-trust
-- verified internally; no direct client writes to groups.name or group_memberships.role.
grant execute on function public.rename_group(uuid, text)  to authenticated, service_role;
grant execute on function public.remove_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.promote_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.leave_group(uuid)         to authenticated, service_role;
grant execute on function public.mint_invite(uuid, integer, timestamptz) to authenticated, service_role;

-- update_group_config (issue #154): commissioner edits per-group league rules
-- (grading_preset, scoring_rules.drop_worst_week / drop_worst_week_start_year,
-- ADR-0018). SECURITY DEFINER; commissioner check + ADR-0007 season-freeze
-- enforced internally. No direct client writes to group_config
-- (upd_group_config_no_client policy stays intact). group_active_season_settled
-- is the shared freeze helper, also called by the group page load to lock the UI selector.
grant execute on function public.update_group_config(uuid, text, boolean, int) to authenticated, service_role;
grant execute on function public.group_active_season_settled(uuid)        to authenticated, service_role;

-- group_config / group_week_overrides: authenticated read gated by RLS.
-- Client writes are blocked by policy; all writes go through service_role.
revoke all on public.group_config from public, anon;
revoke all on public.group_week_overrides from public, anon;

grant select on public.group_config to authenticated;
grant select on public.group_week_overrides to authenticated;

-- group_invites: commissioners manage invites, gated by RLS; no anon access.
revoke all on public.group_invites from public, anon;

grant select, insert, update on public.group_invites to authenticated;

grant execute on function public.is_commissioner(uuid) to authenticated, service_role;
grant execute on function public.redeem_invite(text) to authenticated, service_role;
-- preview_invite: read-only display state for /join/[code]; SECURITY DEFINER so
-- invitees can preview an invite the commissioner-only RLS would otherwise hide.
grant execute on function public.preview_invite(text) to authenticated, service_role;

-- comments / reactions: members read+write their group's rows, gated by RLS.
-- Strip default anon/public ACLs first (defense in depth alongside RLS).
revoke all on public.comments  from public, anon;
revoke all on public.reactions from public, anon;

grant select, insert, delete on public.comments  to authenticated;
grant select, insert, delete on public.reactions to authenticated;

-- ai_recaps: members read their group's rows; no client writes (service role only).
-- ADR-0008 (AI output is group-scoped, writes via service role batch lane).
revoke all on public.ai_recaps from public, anon;
grant select on public.ai_recaps to authenticated;

-- season_wrapped: members read their group's rows; no client writes (service role only).
-- ADR-0008 (AI output is group-scoped, writes via service role batch lane).
revoke all on public.season_wrapped from public, anon;
grant select on public.season_wrapped to authenticated;

-- update_group_recap_settings (issue #301): commissioner sets AI recap tone (spice)
-- and enable/disable. SECURITY DEFINER; commissioner check enforced internally.
-- No direct client writes to group_config (upd_group_config_no_client stays intact).
grant execute on function public.update_group_recap_settings(uuid, text, boolean) to authenticated, service_role;

-- update_recap_opt_out (issue #301): any member toggles their own AI recap opt-out.
-- SECURITY DEFINER (bypasses the group_memberships with_check role = 'member' guard
-- so commissioners can also opt out). user_id = auth.uid() is the trust boundary.
grant execute on function public.update_recap_opt_out(uuid, boolean) to authenticated, service_role;
