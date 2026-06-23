create index if not exists idx_group_memberships_user_group
  on public.group_memberships(user_id, group_id);
