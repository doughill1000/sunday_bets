create or replace function public.is_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.group_memberships gm
      where gm.group_id = target_group_id
        and gm.user_id = (select auth.uid())
    ),
    false
  );
$$;

revoke execute on function public.is_member(uuid) from public, anon;
