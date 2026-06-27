-- Keyset-pagination index for the group members list (issue #152, ADR-0002 query
-- discipline: group-owned reads lead with a group_id-prefixed index). Matches the
-- group_id equality filter plus the exact ordering used by public.group_members_page:
-- role, joined_at, user_id (all ascending), with user_id the unique tie-breaker that
-- makes the keyset cursor total. The existing idx_group_memberships_user_group
-- (user_id, group_id) serves per-user lookups but is NOT group_id-leading, so it
-- cannot serve a group-scoped, ordered member page. EXPLAIN: Index Scan, no Sort.
create index if not exists idx_group_memberships_group_role_joined
  on public.group_memberships (group_id, role, joined_at, user_id);
