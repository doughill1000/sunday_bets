-- leaderboard_season_page: one bounded, keyset-paginated page of a group's season
-- standings (issue #152). Reads the leaderboard_season_totals materialized view
-- (#191) and returns rows in display order -- total_points/wins/pushes descending,
-- with user_id as the unique descending tie-breaker so the cursor is a total order
-- and pages are stable under inserts. Served by idx_leaderboard_season_totals_keyset.
--
-- Keyset cursor: pass the last row of the previous page as
-- (p_after_total_points, p_after_wins, p_after_pushes, p_after_user_id). All four are
-- NULL for the first page. The row-value comparison `(...) < (...)` works because the
-- ORDER BY is descending on every cursor column, so "after the cursor" == "tuple is
-- lexicographically less than the cursor tuple".
--
-- SECURITY INVOKER by design. The source matview is granted to service_role ONLY
-- (#191) -- it holds every group's rows and carries no RLS -- so this function is
-- reachable only by the service-role server client, which is the group_id trust
-- boundary (it passes the caller's own group from the session). It is intentionally
-- NOT granted to authenticated: that would let any signed-in user read other groups'
-- standings by passing an arbitrary p_group_id, violating ADR-0002 cross-group denial.
-- service_role EXECUTE comes from the blanket grant in grants/admin_grants.sql; the
-- closed-by-default ACL guard strips the implicit PUBLIC grant.
--
-- Re-emitted with #274 and #357/ADR-0018: this function `returns setof`
-- leaderboard_season_totals, so any re-emission of that matview must CASCADE-drop this
-- function (see the view source) and recreate it here afterward. The ACL guard +
-- default privileges re-close/grant on recreate. Touch this file (even with no
-- functional change) in every migration that re-emits leaderboard_season_totals.sql,
-- so the generator bundles both in the same migration -- otherwise the CASCADE drop
-- has no recreate to pair with.
create or replace function public.leaderboard_season_page(
  p_group_id uuid,
  p_season_year int,
  p_limit int default 50,
  p_after_total_points int default null,
  p_after_wins int default null,
  p_after_pushes int default null,
  p_after_user_id uuid default null
)
returns setof public.leaderboard_season_totals
language sql
stable
as $$
  select *
  from public.leaderboard_season_totals
  where group_id = p_group_id
    and season_year = p_season_year
    and (
      p_after_user_id is null
      or (total_points, wins, pushes, user_id)
         < (p_after_total_points, p_after_wins, p_after_pushes, p_after_user_id)
    )
  order by total_points desc, wins desc, pushes desc, user_id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

comment on function public.leaderboard_season_page(uuid, int, int, int, int, int, uuid) is
  'Keyset-paginated page of a group''s season standings (issue #152). service_role-only; '
  'the server passes the caller''s own group_id as the trust boundary (ADR-0002).';
