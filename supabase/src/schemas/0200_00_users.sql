-- USERS (profile mirror of auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'player', -- 'player' | 'admin'
  created_at timestamptz not null default now()
);
