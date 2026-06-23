-- Stable original group for the invisible v1.7 tenancy migration.
insert into public.groups (id, name)
values ('00000000-0000-4000-8000-000000000017', 'Sunday Bets')
on conflict (id) do nothing;

insert into public.group_memberships (group_id, user_id, role)
select
  '00000000-0000-4000-8000-000000000017'::uuid,
  u.id,
  case
    when u.role = 'admin' then 'commissioner'::public.group_membership_role
    else 'member'::public.group_membership_role
  end
from public.users u
on conflict (group_id, user_id) do nothing;

update public.picks
set group_id = '00000000-0000-4000-8000-000000000017'
where group_id is null;

update public.pick_settlement ps
set group_id = coalesce(
  (
    select p.group_id
    from public.picks p
    where p.id = ps.pick_id
  ),
  '00000000-0000-4000-8000-000000000017'::uuid
)
where ps.group_id is null;

alter table public.picks
  alter column group_id set not null;

alter table public.pick_settlement
  alter column group_id set not null;

alter table public.pick_settlement
  drop constraint if exists pick_settlement_pick_id_fkey;

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

alter table public.picks
  drop constraint if exists picks_user_game_unique;

alter table public.picks
  drop constraint if exists uq_picks_user_game;

drop index if exists public.uq_picks_user_game;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.picks'::regclass
      and conname = 'picks_pkey'
  ) then
    alter table public.picks
      add constraint picks_pkey primary key (group_id, user_id, game_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.picks'::regclass
      and conname = 'picks_group_user_game_unique'
  ) then
    alter table public.picks
      add constraint picks_group_user_game_unique unique (group_id, user_id, game_id);
  end if;
end$$;

create index if not exists idx_picks_group_game_user
  on public.picks(group_id, game_id, user_id);

alter table public.pick_settlement
  add constraint pick_settlement_pick_id_fkey
  foreign key (pick_id)
  references public.picks(id)
  on delete cascade;

alter table public.pick_settlement
  drop constraint if exists pick_settlement_pkey;

alter table public.pick_settlement
  add constraint pick_settlement_pkey primary key (group_id, user_id, game_id);

alter table public.picks
  drop constraint if exists picks_group_id_fkey;

alter table public.picks
  add constraint picks_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete cascade;

alter table public.pick_settlement
  drop constraint if exists pick_settlement_group_id_fkey;

alter table public.pick_settlement
  add constraint pick_settlement_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete cascade;
