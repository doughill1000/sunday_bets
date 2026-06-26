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
