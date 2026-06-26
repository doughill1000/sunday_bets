-- GAMES
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  week_id integer not null references public.weeks(id) on delete cascade,
  external_game_id text unique,          -- Odds API game id (optional)
  commence_time timestamptz not null,
  home_team_id integer not null references public.teams(id),
  away_team_id integer not null references public.teams(id),
  status text not null default 'scheduled', -- scheduled | in_progress | final | postponed
  final_scores jsonb                      -- {home:int, away:int}
);
