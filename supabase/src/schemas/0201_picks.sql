-- file: schemas/0201_picks.sql

-- Ensure UUID generator is available
create extension if not exists pgcrypto;

-- 1) Add the surrogate id column used by server code and settlement FKs.
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

-- 2) Backfill existing ids.
update public.picks
set id = gen_random_uuid()
where id is null;

-- 3) Enforce NOT NULL + default for future inserts.
alter table public.picks
  alter column id set not null;

alter table public.picks
  alter column id set default gen_random_uuid();

-- 4) Add the group tenancy column.
alter table public.picks
  add column if not exists group_id uuid;

-- 5) Keep the surrogate id usable as an FK target after the PK moves.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.picks'::regclass
      and conname = 'picks_id_key'
  ) then
    alter table public.picks
      add constraint picks_id_key unique (id);
  end if;
end$$;
