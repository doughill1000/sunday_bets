-- Schema usage
grant usage on schema public to service_role;
grant usage on schema public to authenticated, anon;

-- Functions (RPCs): allow execution now and for future functions
grant execute on all functions in schema public to anon, service_role, authenticated;

alter default privileges in schema public
  grant execute on functions to anon, service_role, authenticated;

-- Base read for common tables (RLS still applies)
grant select on public.games, public.game_lines, public.results, public.totals,
               public.users, public.weeks, public.seasons, public.teams
to authenticated;

-- Picks DML (RLS enforces who/when)
grant select, insert, update on public.picks to authenticated;

-- Settings & audit (admin gated by RLS)
grant select, insert, update, delete on public.settings, public.audit_log to authenticated;

-- Optional: anon can read public game data if needed
grant select on public.games, public.game_lines to anon;

-- ENUM type usage
grant usage on type public.weight_enum to anon, authenticated;
grant usage on type public.side_enum to anon, authenticated;

-- Service role broad access (server-only)
grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public to service_role;

grant usage, select
  on all sequences in schema public to service_role;

grant execute on all functions in schema public to service_role;

-- Future objects -> service_role
alter default privileges in schema public
  grant select, insert, update, delete, truncate, references, trigger
  on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;
