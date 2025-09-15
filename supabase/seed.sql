-- Insert test users
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('test-user-1', 'test1@example.com', now(), now(), now()),
  ('test-user-2', 'test2@example.com', now(), now(), now()),
  ('test-user-3', 'test3@example.com', now(), now(), now());

-- Insert corresponding profiles
INSERT INTO public.users (id, email, role)
VALUES 
  ('test-user-1', 'test1@example.com', 'player'),
  ('test-user-2', 'test2@example.com', 'player'),
  ('test-user-3', 'test3@example.com', 'player');

-- Insert test teams
INSERT INTO public.teams (name, short_name)
VALUES 
  ('Kansas City Chiefs', 'KC'),
  ('Buffalo Bills', 'BUF');

-- Insert test season and week
INSERT INTO public.seasons (year) VALUES (2024);
INSERT INTO public.weeks (season_id, week_number, start_ts, end_ts) 
VALUES (1, 1, '2024-09-01', '2024-09-08');