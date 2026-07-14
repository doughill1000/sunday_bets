-- wrapped_seen: cross-device "seen" marker for the once-per-season Wrapped flash
-- (#548, mirrors recap_seen / #302). One row per user/group/season once the player
-- has dismissed the flash. Unlike ai_recaps/notification_log (service-role writes
-- only), the player sets this directly on dismiss, so RLS (not a SECURITY DEFINER
-- RPC) gates the write — same shape as recap_seen, minus week_number since Wrapped
-- is season-scoped rather than weekly.
create table if not exists public.wrapped_seen (
  user_id     uuid not null references public.users(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  season_year integer not null,
  seen_at     timestamptz not null default now(),
  primary key (user_id, group_id, season_year)
);

alter table public.wrapped_seen enable row level security;
