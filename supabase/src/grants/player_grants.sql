-- =========================
-- PLAYER (authenticated, non-admin)
-- =========================

-- Basic resolution
grant usage on schema public to authenticated;

-- Start from zero function access for users
revoke execute on all functions in schema public from authenticated;
alter default privileges in schema public revoke execute on functions from authenticated;

-- Enums used by player RPCs
grant usage on type public.weight_enum to authenticated;
grant usage on type public.side_enum  to authenticated;

-- Base table privileges (RLS still enforces row/column rules)
grant select on public.games,
               public.game_lines,
               public.results,
               public.totals,
               public.users,
               public.weeks,
               public.seasons,
               public.teams
to authenticated;

-- Picks CRUD the player needs; RLS gates who/when
grant select, insert, update on public.picks to authenticated;

-- Settings & audit:
-- Grant SELECT so admins (who are also 'authenticated') can read via RLS (is_admin()).
-- Do NOT grant write widely; writes happen via SECURITY DEFINER admin RPCs.
grant select on public.settings, public.audit_log to authenticated;

-- cron_run_log: admin-only reads via RLS (is_admin()); writes come from service role.
-- Supabase's default ACL auto-grants ALL on new public tables to anon/authenticated,
-- so strip anon (and PUBLIC) first -- defense in depth alongside RLS, mirroring the
-- revoke/grant pattern on public.picks_status_view_user. authenticated keeps SELECT,
-- gated to admins by the admin_sel_cron_run_log policy.
revoke all on public.cron_run_log from public, anon;
grant select on public.cron_run_log to authenticated;

-- push_subscriptions: owners manage their own rows; RLS gates which rows.
-- Strip the default anon/PUBLIC ACL first (defense in depth alongside RLS).
revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- notification_log: owners read their own rows via RLS; writes come from service role.
revoke all on public.notification_log from public, anon;
grant select on public.notification_log to authenticated;

-- NOTE: Do not grant EXECUTE here. Each RPC file should append its own:
--   - public get-only RPCs (e.g., get_active_week_games): GRANT to anon, authenticated
--   - player RPCs (lock_pick, unlock_pick): GRANT to authenticated
--   - admin RPCs: handled via service_role or guarded is_admin() (see admin_grants.sql)
