create table
  if not exists public.pick_settlement (
    pick_id uuid primary key references public.picks (id) on delete cascade,
    game_id uuid not null references public.games (id) on delete cascade,
    points_delta int,
    outcome public.pick_outcome,
    graded_at timestamptz not null default now ()
  );

alter table public.pick_settlement enable row level security;

create policy "read settlements" on public.pick_settlement for
select
  to authenticated using (true);

create policy "no client writes (insert)" on public.pick_settlement for insert to authenticated
with
  check (false);

create policy "no client writes (update)" on public.pick_settlement for
update to authenticated using (false)
with
  check (false);

create policy "no client writes (delete)" on public.pick_settlement for delete to authenticated using (false);

alter table public.pick_settlement add constraint pick_settlement_points_range check (points_delta in (-10, -5, -3, -1, 0, 1, 3, 5, 10));