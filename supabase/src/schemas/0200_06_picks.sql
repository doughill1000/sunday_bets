create table if not exists public.picks (
  user_id uuid not null references public.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  picked_team_id integer not null references public.teams(id),
  weight public.weight_enum not null,
  -- final frozen snapshot at the moment of the last pre-kickoff change
  locked_at timestamptz,
  locked_line_id integer,
  locked_spread_team_id integer,
  locked_spread_value numeric,
  locked_by uuid not null default auth.uid(),
  primary key (user_id, game_id)
);
