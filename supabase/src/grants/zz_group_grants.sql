-- groups / group_memberships: authenticated access is gated by RLS.
-- Strip default public/anon ACLs first so anon has no Data API access.
revoke all on public.groups from public, anon;
revoke all on public.group_memberships from public, anon;

grant select on public.groups to authenticated;
grant select, insert on public.group_memberships to authenticated;

grant execute on function public.is_member(uuid) to authenticated, service_role;

-- group_config / group_week_overrides: authenticated read gated by RLS.
-- Client writes are blocked by policy; all writes go through service_role.
revoke all on public.group_config from public, anon;
revoke all on public.group_week_overrides from public, anon;

grant select on public.group_config to authenticated;
grant select on public.group_week_overrides to authenticated;

-- comments / reactions: members read+write their group's rows, gated by RLS.
-- Strip default anon/public ACLs first (defense in depth alongside RLS).
revoke all on public.comments  from public, anon;
revoke all on public.reactions from public, anon;

grant select, insert, delete on public.comments  to authenticated;
grant select, insert, delete on public.reactions to authenticated;
