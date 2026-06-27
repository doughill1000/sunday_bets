-- GROUP_CONFIG: one row per group, holds group-owned gameplay settings.
-- Operational settings (odds-quota caps, penalties) remain on the global settings table.
create table if not exists public.group_config (
  group_id    uuid primary key references public.groups(id) on delete cascade,
  -- Which odds source this group uses for its active line
  line_source text not null default 'fanduel',
  -- Which grading preset: 'house' grades all members on the closing line (fair);
  -- 'gamer' grades each member on their own pick-time line (legacy).
  grading_preset text not null default 'house'
    check (grading_preset in ('gamer', 'house')),
  -- Flexible JSONB bag for gameplay rule knobs (drop-worst-week, multipliers, etc.)
  -- Future rule features (issue #107) write their settings here.
  scoring_rules jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Additive column for existing DBs; the definition above handles fresh DBs.
alter table public.group_config
  add column if not exists grading_preset text not null default 'house'
    check (grading_preset in ('gamer', 'house'));
