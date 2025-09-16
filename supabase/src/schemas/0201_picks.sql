-- file: schemas/0201_pick_surrogate_id.sql

-- Ensure UUID generator is available
create extension if not exists pgcrypto;

-- 1) Add the column (no PK yet)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'picks'
      and column_name = 'id'
  ) then
    alter table public.picks add column id uuid;
  end if;
end$$;

-- 2) Backfill existing rows
update public.picks
set id = gen_random_uuid()
where id is null;

-- 3) Enforce NOT NULL + default for future inserts
alter table public.picks
  alter column id set not null;

alter table public.picks
  alter column id set default gen_random_uuid();

-- 4) Drop the old primary key (usually picks_pkey) if it exists
do $$
declare
  pk_name text;
begin
  select conname into pk_name
  from pg_constraint
  where conrelid = 'public.picks'::regclass
    and contype = 'p'
  limit 1;

  if pk_name is not null then
    execute format('alter table public.picks drop constraint %I', pk_name);
  end if;
end$$;

-- 5) Create the new primary key on (id) if not already present
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.picks'::regclass
      and contype = 'p'
  ) then
    alter table public.picks
      add constraint picks_pkey primary key (id);
  end if;
end$$;

-- 6) Keep uniqueness on (user_id, game_id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'picks_user_game_unique'
  ) then
    alter table public.picks
      add constraint picks_user_game_unique unique (user_id, game_id);
  end if;
end$$;
