-- Enable pgcrypto for crypt() in case you need passwords
create extension if not exists pgcrypto;

-- Insert auth users (triggers will mirror into public.users with display_name)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test1@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test1"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test2"}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test3@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test3"}', now(), now());

-- Optionally elevate one user to admin
update public.users set role = 'admin' where id = '00000000-0000-0000-0000-000000000001';

-- Insert test teams (league defaults to 'NFL')
insert into public.teams (name, short_name)
values
  ('Kansas City Chiefs', 'KC'),
  ('Buffalo Bills', 'BUF');

-- Insert test season + capture id
with s as (
  insert into public.seasons (year) values (2024) returning id
)
insert into public.weeks (season_id, week_number, start_ts, end_ts)
select id, 1, '2024-09-01'::timestamptz, '2024-09-08'::timestamptz from s;
