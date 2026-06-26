-- TOTALS
create table if not exists public.totals (
  user_id uuid not null references public.users(id) on delete cascade,
  week_id integer not null references public.weeks(id) on delete cascade,
  points_delta int not null default 0,
  season_total_cached int not null default 0,
  primary key (user_id, week_id)
);
