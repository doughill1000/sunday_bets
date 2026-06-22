-- ---------------------------------------------------------------------------
-- notification_log
-- Audit trail + dedupe ledger for sent push notifications. Written by the
-- service role only; users may read their own rows via RLS.
--   kind:   'pick_reminder' | 'line_shift' | 'test'
--   detail: e.g. { "from": -3, "to": -5.5, "threshold": 2 }
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  kind       text not null,
  game_id    uuid references public.games(id) on delete cascade,
  week_id    integer references public.weeks(id) on delete cascade,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_log_user_kind_game
  on public.notification_log (user_id, kind, game_id);

alter table public.notification_log enable row level security;
