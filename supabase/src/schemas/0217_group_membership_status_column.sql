alter table public.group_memberships
  add column if not exists status public.group_membership_status not null default 'active';
