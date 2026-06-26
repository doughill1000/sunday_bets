# Runbook — ADR-0012 prod/staging reconciliation (post-squash)

**Status:** executed 2026-06-26 against **prod** (`anzcshrpfpxajcgrwczv`) and
**staging/QA** (`eoncckeqqogezoftooix`) via the Supabase MCP, with explicit owner
confirmation. This file is the as-run record ADR-0012 §Follow-up calls for.

ADR-0012 PR2 (issue #249, PR #252) collapsed the 63-file migration history into one
regenerated `supabase/migrations/20260626184826_baseline.sql`. The squash is **history
only** — it must not re-run DDL against prod, which already physically contains every
object. Three gated reconciliation steps remained, all of which mutate live bookkeeping
or ACLs and so were deferred out of the squash PR. They are now done.

> **Why this is safe.** The app is not in active use (offseason; see CLAUDE.md). All
> three steps are subtractive or pure bookkeeping; none run the baseline's `create`
> DDL. Each ran in a transaction with a trailing verification query.

## Precondition (verified before running)

- The baseline reproduces prod's schema exactly (proven in PR #252 by normalized catalog
  hash; `pnpm db:migration:verify` GREEN).
- prod + staging `supabase_migrations.schema_migrations` both listed the same 64
  pre-squash versions and **neither** contained the new baseline version.
- The two orphan functions exist only in prod/staging, **not** in `supabase/src/**` or the
  baseline, and have **no** dependent trigger, view, RLS policy, or column default.
- prod + staging grant `authenticated` the full privilege set
  (`SELECT,INSERT,UPDATE,DELETE,REFERENCES,TRIGGER,TRUNCATE`) on every `public` table — a
  legacy pre-ledger `GRANT ALL`. The over-grant is pure excess (no table is _under_-granted
  vs. the baseline), so reconciliation is strictly subtractive.

## Step 1 — `migration repair` (history bookkeeping)

`supabase db push` failed after PR #252 with _"Remote migration versions not found in
local migrations directory"_ because the remote still listed all 64 pre-squash versions.
Equivalent to `supabase migration repair --status reverted <64 versions> --status applied
20260626184826`, run as a single transaction on each project:

```sql
begin;
delete from supabase_migrations.schema_migrations
 where version <> '20260626184826';
insert into supabase_migrations.schema_migrations (version, name)
 values ('20260626184826', 'baseline')
 on conflict (version) do nothing;
commit;
```

**Result:** each `schema_migrations` table now holds exactly the single `20260626184826
baseline` row; the next `supabase db push` reports the remote up to date. No DDL executed.

## Step 2 — drop prod-only orphan functions

`public.current_active_line(uuid)` and `public.fn_picks_lock_guard()` exist in
prod/staging but in neither `src/` nor the baseline, with no dependents (verified against
`pg_trigger`, `pg_views`, `pg_policy`, `pg_attrdef`). Folded into Step 3's transaction:

```sql
drop function if exists public.current_active_line(uuid);
drop function if exists public.fn_picks_lock_guard();
```

(`if exists` makes this a no-op where the function is already absent — staging carried
only `current_active_line`.)

## Step 3 — tighten `authenticated` table grants to the baseline

PR1 (closed-by-default) revoked the `PUBLIC`/`anon` defaults but, by design, never
blanket-revokes `authenticated`, so the legacy `GRANT ALL` to `authenticated` survived on
every table. Clear it and re-grant exactly the baseline's tight per-table subset. Run as
one transaction per project (with Step 2):

```sql
begin;
drop function if exists public.current_active_line(uuid);
drop function if exists public.fn_picks_lock_guard();

revoke all on all tables in schema public from authenticated;

grant select on public.audit_log to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select on public.cron_run_log to authenticated;
grant select on public.group_config to authenticated;
grant select, insert, update on public.group_invites to authenticated;
grant select on public.group_memberships to authenticated;
grant select on public.group_week_overrides to authenticated;
grant select on public.groups to authenticated;
grant select on public.notification_log to authenticated;
grant select on public.pick_settlement to authenticated;
grant select, insert, update, delete on public.picks to authenticated;
grant select on public.picks_group_view to authenticated;
grant select on public.picks_status_view_user to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, delete on public.reactions to authenticated;
grant select on public.settings to authenticated;
commit;
```

**Resulting `authenticated` table privileges (identical on prod and staging):**

| table                                                                                                                                                                         | privileges                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| audit_log, cron_run_log, group_config, group_memberships, group_week_overrides, groups, notification_log, pick_settlement, picks_group_view, picks_status_view_user, settings | `SELECT`                         |
| group_invites                                                                                                                                                                 | `SELECT, INSERT, UPDATE`         |
| comments, reactions                                                                                                                                                           | `SELECT, INSERT, DELETE`         |
| picks, push_subscriptions                                                                                                                                                     | `SELECT, INSERT, UPDATE, DELETE` |

Every other `public` table/view (`games`, `game_lines`, `results`, `totals`, `teams`,
`weeks`, `seasons`, `users`, `ui_games`, `current_season_year`, `leaderboard_*`,
`picks_status_view_admin`, `stats_*`) now grants `authenticated` **nothing** — those reads
flow through the service-role server layer or SECURITY DEFINER RPCs, matching the baseline.

## Verification (run after each step)

```sql
-- history: exactly one row, the baseline
select version, name from supabase_migrations.schema_migrations order by version;

-- orphans gone
select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('current_active_line','fn_picks_lock_guard');

-- grants match the table above
select table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
from information_schema.role_table_grants
where grantee = 'authenticated' and table_schema = 'public'
group by table_name order by table_name;
```

All three verified GREEN on both projects on 2026-06-26.

## Still open under #249 (not part of this reconciliation)

- pgTAP offline-bootstrap hardening (ADR-0011 follow-up).
- Promote `db:migration:verify` to a required gate (remove `continue-on-error` from
  `ci-migration-verify.yml`).
- Set ADR-0012 status to `Accepted` once the two items above land.
