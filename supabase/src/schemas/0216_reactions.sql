create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint reactions_emoji_not_blank check (length(btrim(emoji)) > 0),
  -- one reaction per emoji per user per game per group
  constraint reactions_unique_user_game_emoji unique (group_id, user_id, game_id, emoji)
);

create index if not exists idx_reactions_group_game
  on public.reactions (group_id, game_id);
