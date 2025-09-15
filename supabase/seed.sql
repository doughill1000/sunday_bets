-- Enable the pgcrypto extension to use crypt() function for passwords
create extension if not exists pgcrypto;

-- Insert test users with valid UUIDs and required auth fields
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test1@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test3@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- Insert corresponding profiles using the same UUIDs
insert into public.users (id, email, role)
values
  ('00000000-0000-0000-0000-000000000001', 'test1@example.com', 'player'),
  ('00000000-0000-0000-0000-000000000002', 'test2@example.com', 'player'),
  ('00000000-0000-0000-0000-000000000003', 'test3@example.com', 'player');

-- Insert test teams
insert into public.teams (name, short_name)
values
  ('Kansas City Chiefs', 'KC'),
  ('Buffalo Bills', 'BUF');

-- Insert test season and week
insert into public.seasons (year) values (2024);
insert into public.weeks (season_id, week_number, start_ts, end_ts)
values (1, 1, '2024-09-01', '2024-09-08');