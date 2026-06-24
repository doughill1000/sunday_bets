alter table public.settings
  add column if not exists final_week_unlimited_allin boolean not null default true;
