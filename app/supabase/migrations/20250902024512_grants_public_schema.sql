-- Restrict public schema by default
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Functions (RPCs): allow execution now and in the future
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role, authenticated;
