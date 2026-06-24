create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_not_blank check (length(btrim(body)) > 0)
);

create index if not exists idx_comments_group_game
  on public.comments (group_id, game_id, created_at);
