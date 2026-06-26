-- RESULTS
create table if not exists public.results (
  game_id uuid primary key references public.games(id) on delete cascade,
  winning_team_id integer,
  cover_result text, -- 'home' | 'away' | 'push'
  graded_at timestamptz not null default now()
);
