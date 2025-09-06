-- SCHEMA USAGE
grant usage on schema public to anon, authenticated, service_role;

-- FUNCTIONS (RPCs)
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ENUM TYPES
grant usage on type public.weight_enum, public.side_enum to anon, authenticated;