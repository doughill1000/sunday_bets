-- -- Enable pgcrypto for crypt() in case you need passwords
-- create extension if not exists pgcrypto;

-- -- Insert auth users (triggers will mirror into public.users with display_name)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'admin', 'admin@example.com', crypt('password123', gen_salt('bf')), now(), '{"role":"admin","provider":"email","providers":["email"]}', '{"display_name":"test1"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'player', 'test2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test2"}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'player', 'test3@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test3"}', now(), now());