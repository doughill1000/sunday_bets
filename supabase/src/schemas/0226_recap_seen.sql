-- recap_seen: cross-device "seen" marker for the once-per-week recap flash (#302).
-- One row per user/group/week once the player has dismissed the flash. Unlike
-- ai_recaps/notification_log (service-role writes only), the player sets this
-- directly on dismiss, so RLS (not a SECURITY DEFINER RPC) gates the write.
create table if not exists public.recap_seen (
  user_id     uuid not null references public.users(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  season_year integer not null,
  week_number integer not null,
  seen_at     timestamptz not null default now(),
  primary key (user_id, group_id, season_year, week_number)
);

alter table public.recap_seen enable row level security;
