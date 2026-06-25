-- Per-user capability for the gated create-group flow (ADR-0006, decision 3).
-- In 'gated' mode only users with this capability may create a group; in 'open'
-- mode it is ignored. Orthogonal to public.users.role (the global admin tier):
-- granting create rights never grants admin, and admin does not imply it.
alter table public.users
  add column if not exists can_create_group boolean not null default false;
