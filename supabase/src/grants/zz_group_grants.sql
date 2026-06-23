-- groups / group_memberships: authenticated access is gated by RLS.
-- Strip default public/anon ACLs first so anon has no Data API access.
revoke all on public.groups from public, anon;
revoke all on public.group_memberships from public, anon;

grant select on public.groups to authenticated;
grant select, insert on public.group_memberships to authenticated;

grant execute on function public.is_member(uuid) to authenticated, service_role;
