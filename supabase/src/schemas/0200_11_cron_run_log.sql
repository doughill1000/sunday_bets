-- ---------------------------------------------------------------------------
-- cron_run_log
-- ---------------------------------------------------------------------------
create table if not exists public.cron_run_log (
  id          bigint generated always as identity primary key,
  job         text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  summary     jsonb,
  error       text
);
alter table public.cron_run_log enable row level security;
