-- Global group-creation mode for the hybrid growth model (ADR-0006, decision 3).
--   'gated': only users with public.users.can_create_group may create a group.
--   'open' : any authenticated user may create.
-- Flipping this value is a configuration change, not a schema migration, so the
-- product can open up creation on a business decision. Operational settings stay
-- on the existing single-row settings object per ADR-0002.
alter table public.settings
  add column if not exists group_creation_mode text not null default 'gated';

alter table public.settings
  drop constraint if exists settings_group_creation_mode_check;
alter table public.settings
  add constraint settings_group_creation_mode_check
  check (group_creation_mode in ('gated', 'open'));
