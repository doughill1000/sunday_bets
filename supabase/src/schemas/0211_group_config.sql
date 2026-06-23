-- GROUP_CONFIG: one row per group, holds group-owned gameplay settings.
-- Operational settings (odds-quota caps, penalties) remain on the global settings table.
create table if not exists public.group_config (
  group_id    uuid primary key references public.groups(id) on delete cascade,
  -- Which odds source this group uses for its active line
  line_source text not null default 'fanduel',
  -- Flexible JSONB bag for gameplay rule knobs (drop-worst-week, multipliers, etc.)
  -- Future rule features (issue #107) write their settings here.
  scoring_rules jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
