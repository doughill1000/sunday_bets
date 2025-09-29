-- -- Enable pgcrypto for crypt() in case you need passwords
-- create extension if not exists pgcrypto;

-- -- Insert auth users (triggers will mirror into public.users with display_name)
-- insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
-- values
--   ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test1@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test1"}', now(), now()),
--   ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test2"}', now(), now()),
--   ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test3@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test3"}', now(), now());

-- -- Manually insert into public.users in case the trigger isn't working
-- insert into public.users (id, display_name, role) 
-- values
--   ('00000000-0000-0000-0000-000000000001', 'test1', 'player'),
--   ('00000000-0000-0000-0000-000000000002', 'test2', 'player'),
--   ('00000000-0000-0000-0000-000000000003', 'test3', 'player')
-- on conflict (id) do nothing;

-- -- Optionally elevate one user to admin
-- -- update public.users set role = 'admin' where id = '9ea5bb60-c146-40fd-8d19-3b26a317e87c';
-- -- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"app_role": "admin"}'::jsonb where id = '9ea5bb60-c146-40fd-8d19-3b26a317e87c';

-- -- Insert test teams (league defaults to 'NFL')
-- insert into public.teams (name, short_name)
-- values
--   ('Kansas City Chiefs', 'KC'),
--   ('Buffalo Bills', 'BUF');

-- -- Insert test season + capture id
-- with s as (
--   insert into public.seasons (year) values (2024) returning id
-- )
-- insert into public.weeks (season_id, week_number, start_ts, end_ts)
-- select id, 1, '2024-09-01'::timestamptz, '2024-09-08'::timestamptz from s;

-- -- Insert settings with missed pick penalty
-- insert into public.settings (id, missed_pick_penalty, odds_api_calls_used_current_month, odds_api_monthly_cap)
-- values (true, 1, 0, 500)
-- on conflict (id) do update set missed_pick_penalty = 1;