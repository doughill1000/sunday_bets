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
