-- =========================
-- ADMIN (JWT claim role=admin)
-- =========================
-- No separate DB role for "admin"; it's a claim checked by RLS/functions.
-- Admin-only behavior is enforced by:
--   - RLS USING/WITH CHECK (is_admin())
--   - Admin RPCs that call is_admin() and raise on non-admins

-- =========================
-- SERVICE ROLE (server-side key; bypasses RLS)
-- =========================
-- Full, explicit privileges for backend tasks and admin RPC execution.

grant usage on schema public to service_role;

grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Keep future objects service-ready
alter default privileges in schema public
  grant select, insert, update, delete, truncate, references, trigger on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;

-- Optional: if you prefer admin RPCs callable ONLY by backend,
-- don't grant EXECUTE to 'authenticated' for those RPCs at all.
-- Call them from your API route with the service key.
