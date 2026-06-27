-- group_members_page: one bounded, keyset-paginated page of a group's members joined
-- to their user profile (issue #152). Returns rows in display order -- role, then
-- joined_at, then user_id -- all ascending, with user_id the unique tie-breaker so
-- the cursor is a total order and pages are stable under inserts. Served by
-- idx_group_memberships_group_role_joined.
--
-- Keyset cursor: pass the last row of the previous page as
-- (p_after_role, p_after_joined_at, p_after_user_id); all NULL for the first page.
-- The row-value comparison `(...) > (...)` works because the ORDER BY is ascending on
-- every cursor column. Enum role uses its declared order (commissioner before member).
--
-- SECURITY INVOKER, service_role-only -- the group page load reads members via the
-- service-role client and passes the caller's own group_id (the trust boundary,
-- ADR-0002). Not granted to authenticated; service_role EXECUTE comes from the
-- blanket admin grant. No status filter: this mirrors the previous inline query so
-- existing single-group output is unchanged.
create or replace function public.group_members_page(
  p_group_id uuid,
  p_limit int default 50,
  p_after_role public.group_membership_role default null,
  p_after_joined_at timestamptz default null,
  p_after_user_id uuid default null
)
returns table (
  group_id uuid,
  user_id uuid,
  role public.group_membership_role,
  joined_at timestamptz,
  display_name text,
  avatar_key text
)
language sql
stable
as $$
  select
    m.group_id,
    m.user_id,
    m.role,
    m.joined_at,
    u.display_name,
    u.avatar_key
  from public.group_memberships m
  join public.users u on u.id = m.user_id
  where m.group_id = p_group_id
    and (
      p_after_user_id is null
      or (m.role, m.joined_at, m.user_id)
         > (p_after_role, p_after_joined_at, p_after_user_id)
    )
  order by m.role, m.joined_at, m.user_id
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

comment on function public.group_members_page(uuid, int, public.group_membership_role, timestamptz, uuid) is
  'Keyset-paginated page of a group''s members + profile (issue #152). service_role-only; '
  'the server passes the caller''s own group_id as the trust boundary (ADR-0002).';
