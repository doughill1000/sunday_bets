insert into settings (odds_api_monthly_cap, odds_api_calls_used_current_month, admin_flags)
values (500, 0, '{}'::jsonb)
on conflict (id) do update
set odds_api_monthly_cap = excluded.odds_api_monthly_cap;