-- Enable pgcrypto for crypt() in case you need passwords
create extension if not exists pgcrypto;

-- Insert auth users (triggers will mirror into public.users with display_name)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', crypt('password', gen_salt('bf')), now(), '{"role":"admin","provider":"email","providers":["email"]}', '{"display_name":"test1"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test2@example.com', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test2"}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test3@example.com', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"test3"}', now(), now());

-- Identities are required for password login
insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'admin@example.com', 'email', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@example.com"}', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'test2@example.com', 'email', '{"sub":"00000000-0000-0000-0000-000000000002","email":"test2@example.com"}', now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'test3@example.com', 'email', '{"sub":"00000000-0000-0000-0000-000000000003","email":"test3@example.com"}', now(), now());

-- GoTrue scans these token columns into non-nullable Go strings; leaving them NULL makes
-- login fail with "Database error querying schema" on current Supabase CLI versions. Set
-- them to '' so the seeded users can actually password-login.
update auth.users
set confirmation_token        = coalesce(confirmation_token, ''),
    recovery_token            = coalesce(recovery_token, ''),
    email_change_token_new    = coalesce(email_change_token_new, ''),
    email_change              = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change              = coalesce(phone_change, ''),
    phone_change_token        = coalesce(phone_change_token, ''),
    reauthentication_token    = coalesce(reauthentication_token, '');