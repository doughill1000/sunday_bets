-- ---------------------------------------------------------------------------
-- notification_log
-- Audit trail + dedupe ledger for sent push notifications. Written by the
-- service role only; users may read their own rows via RLS.
--   kind:   'pick_reminder' | 'line_shift' | 'results_recap' | 'ai_recap' | 'test'
--   detail: e.g. { "from": -3, "to": -5.5, "threshold": 2 }
--   group_id: set for group-scoped kinds (e.g. 'ai_recap', dedup per user+group+week)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  kind       text not null,
  game_id    uuid references public.games(id) on delete cascade,
  week_id    integer references public.weeks(id) on delete cascade,
  group_id   uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- Additive column for existing DBs (must run before the group_id index below).
-- No inline FK: public.groups is defined later (0208_groups.sql); the FK
-- constraint is added in 0227_notification_log_group_fk.sql once it exists.
alter table public.notification_log
  add column if not exists group_id uuid;

create index if not exists idx_notification_log_user_kind_game
  on public.notification_log (user_id, kind, game_id);

create index if not exists idx_notification_log_user_kind_group_week
  on public.notification_log (user_id, kind, group_id, week_id);

alter table public.notification_log enable row level security;
