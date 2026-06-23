create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint groups_name_not_blank check (length(btrim(name)) > 0)
);
