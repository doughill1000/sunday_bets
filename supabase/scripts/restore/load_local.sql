-- Load restored QA data into a freshly-migrated database.
-- Truncates the target tables first so the dump (not seed.sql) is authoritative,
-- then loads data-only COPY blocks with triggers/FKs disabled (replica mode).
-- Safe to re-run. Intended for the LOCAL stack (postgres is superuser there).
\set ON_ERROR_STOP on

begin;
set local session_replication_role = replica;

truncate
  public.audit_log, public.game_lines, public.games, public.pick_settlement,
  public.picks, public.results, public.seasons, public.settings, public.teams,
  public.totals, public.users, public.weeks,
  auth.identities, auth.users
  restart identity cascade;

\i 'C:/Users/dough/code/sunday_bets/supabase/scripts/restore/qa_data_only.sql'

-- The QA dump carries NULLs in these auth.users token columns. GoTrue scans
-- them into non-nullable Go strings, so a NULL makes auth.admin.listUsers /
-- GET /admin/users 500 ("converting NULL to string is unsupported"). Normalize
-- to '' the way GoTrue stores them, so listUsers / provisioning works locally.
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  email_change               = coalesce(email_change, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change_token_current is null
   or email_change is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;

commit;

\echo '--- restored row counts ---'
select 'auth.users'           as table, count(*) from auth.users
union all select 'public.users',           count(*) from public.users
union all select 'public.teams',           count(*) from public.teams
union all select 'public.seasons',         count(*) from public.seasons
union all select 'public.weeks',           count(*) from public.weeks
union all select 'public.games',           count(*) from public.games
union all select 'public.game_lines',      count(*) from public.game_lines
union all select 'public.picks',           count(*) from public.picks
union all select 'public.pick_settlement', count(*) from public.pick_settlement
union all select 'public.audit_log',       count(*) from public.audit_log
order by 1;
