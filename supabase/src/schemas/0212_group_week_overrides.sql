-- GROUP_WEEK_OVERRIDES: per-week rule overrides for a group, keyed (group_id, week_id).
-- Never added as columns on the global weeks table (ADR-0002).
create table if not exists public.group_week_overrides (
  group_id   uuid    not null references public.groups(id) on delete cascade,
  week_id    integer not null references public.weeks(id) on delete cascade,
  -- Special-week rule overrides (e.g. double-points week, locked weights)
  overrides  jsonb   not null default '{}',
  created_at timestamptz not null default now(),
  primary key (group_id, week_id)
);
