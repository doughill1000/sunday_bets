create table if not exists public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.group_membership_role not null default 'member',
  status public.group_membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
