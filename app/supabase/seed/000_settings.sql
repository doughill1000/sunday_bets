insert into settings (odds_api_monthly_cap, odds_api_calls_used_current_month)
values (1000, 0)
on conflict (id) do update
set odds_api_monthly_cap = excluded.odds_api_monthly_cap;