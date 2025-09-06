 
-- =========================
-- ADMIN (authenticated with JWT claim role=admin)
-- =========================
-- No extra GRANTs needed: they rely on same privileges as players,
-- but RLS functions (is_admin()) open up admin-only actions
-- on settings and audit_log.

-- =========================
-- SERVICE ROLE (server-side, full access)
-- =========================
grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete, truncate, references, trigger
  on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;