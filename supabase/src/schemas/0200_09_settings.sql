-- SETTINGS
create table if not exists public.settings (
  id boolean primary key default true, -- single row table
  odds_api_monthly_cap int not null default 500,
  odds_api_calls_used_current_month int not null default 0,
  reset_on date
);
