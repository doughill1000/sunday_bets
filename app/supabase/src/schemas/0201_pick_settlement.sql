create table if not exists public.pick_settlement (
  user_id      uuid not null,
  game_id      uuid not null references public.games(id) on delete cascade,
  pick_id      uuid references public.picks(id) on delete cascade,
  points_delta int,
  outcome      public.pick_outcome,
  graded_at    timestamptz not null default now(),
  constraint pick_settlement_pkey primary key (user_id, game_id)
);

-- keep unique link when a real pick exists
create unique index if not exists uq_pick_settlement_pick_id
  on public.pick_settlement(pick_id)
  where pick_id is not null;

-- more flexible constraint to allow configurable penalties (e.g., -2)
alter table public.pick_settlement
  drop constraint if exists pick_settlement_points_range;

alter table public.pick_settlement
  add constraint pick_settlement_points_range
  check (points_delta between -20 and 10);

-- helpful index for joins by game
create index if not exists idx_pick_settlement_game on public.pick_settlement(game_id);

-- RLS: readable, but no client writes
alter table public.pick_settlement enable row level security;

-- (A) Let authenticated users read settlements (you can tighten to "after kickoff" if desired)
do $$
begin
  drop policy if exists "read settlements" on public.pick_settlement;
exception when undefined_object then null; end$$;

create policy "read settlements"
  on public.pick_settlement
  for select
  to authenticated
  using (true);

-- (B) Block all client writes; grading functions (SECURITY DEFINER) or service role will write
do $$
begin
  drop policy if exists "no client writes (insert)" on public.pick_settlement;
  drop policy if exists "no client writes (update)" on public.pick_settlement;
  drop policy if exists "no client writes (delete)" on public.pick_settlement;
exception when undefined_object then null; end$$;

create policy "no client writes (insert)"
  on public.pick_settlement for insert to authenticated with check (false);

create policy "no client writes (update)"
  on public.pick_settlement for update to authenticated using (false) with check (false);

create policy "no client writes (delete)"
  on public.pick_settlement for delete to authenticated using (false);