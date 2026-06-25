create table if not exists public.group_invites (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups(id) on delete cascade,
  created_by uuid        not null references public.users(id),
  code       text        not null unique,
  expires_at timestamptz,
  max_uses   integer     check (max_uses is null or max_uses > 0),
  used_count integer     not null default 0 check (used_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.group_invites enable row level security;
