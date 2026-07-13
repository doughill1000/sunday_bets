# Runbook — Supabase backup restore drill

**Purpose:** prove the off-platform Supabase backups are _restorable_, not merely
produced. Supabase's Free tier provides **no managed backups**, so the scheduled
`pg_dump` → rclone → OneDrive dumps (`cron-backup.yml`, ADR-0010) are the _only_ copy of
prod. A dump that has never been `pg_restore`d is unproven — this runbook restores the
latest dump into a throwaway database and reconciles its row counts against prod.

**Status:** executed 2026-07-13 (issue #604) against the 2026-07-13 15:23:20 UTC dump —
**PASS, 0 unexplained drift** across all 29 `public` base tables (see
[Drill result](#drill-result--2026-07-13)). Re-run before each NFL season and after any
change to the schema or the backup pipeline.

**Scope:** the restore + verification half only. The backup _production_ path (the
shared `.github/actions/backup-supabase-db` action → rclone → OneDrive) shipped in
PR #507 and is governed by ADR-0010; it is out of scope here.

## What the backup is

- **Producer:** `.github/actions/backup-supabase-db` (shared by `cron-backup.yml` and the
  pre-release `backup` job in `deploy-prod.yml`), so every dump is identical.
- **Format:** `pg_dump --format=custom --no-owner --no-privileges --compress=9` — a single
  compressed custom-format archive of the **whole** prod database (all schemas: `public`,
  `auth`, `storage`, `realtime`, …).
- **Location:** rclone remote `onedrive:supabase-backups/`. Filenames are
  `supabase_<UTC-timestamp>_<label>_<short-sha>.dump`, where `<label>` is `scheduled`
  (weekly cron), `release` (pre-release snapshot), or empty. The filename UTC timestamp is
  the snapshot instant.
- **Cadence / retention:** weekly (Mon 08:00 UTC) + on every prod release + manual
  `workflow_dispatch`; dumps older than 90 days are pruned after each successful upload.

## Preconditions

- **rclone** with the `onedrive:` remote configured (`rclone listremotes` shows
  `onedrive:`). In a real recovery on a fresh machine, reconstruct it from the
  `RCLONE_CONFIG_B64` secret: `echo $B64 | base64 -d > ~/.config/rclone/rclone.conf`.
- **PostgreSQL 17 client tools** (`pg_restore`, `psql`) — match prod's major version (17).
- **A scratch restore target that already has the Supabase roles** (`anon`,
  `authenticated`, `service_role`, `supabase_admin`, …) **and extensions** — the dump's
  RLS policies and functions reference them. Use a **local `supabase start` cluster** (its
  Postgres is on `127.0.0.1:54322`, user/pw `postgres`/`postgres`) or a throwaway Supabase
  project. **Never restore into prod.** A vanilla Postgres install lacks those roles and
  will error on every policy.

## Procedure

Commands below are PowerShell (this repo's primary shell) against a local `supabase start`
cluster. Adjust the connection string for a remote scratch project.

### 1. Select and pull the latest dump

```powershell
# Newest by name == newest by time (filenames are UTC-sortable):
$latest = rclone lsf onedrive:supabase-backups --files-only | Sort-Object -Descending | Select-Object -First 1
rclone copy "onedrive:supabase-backups/$latest" .    # ~1.3 MiB today; seconds
```

Record the filename's UTC timestamp — it is the point-in-time the row-count diff must
reconcile against.

### 2. Inspect the archive (optional sanity check)

```powershell
pg_restore --list $latest | Select-String 'TABLE DATA public '      # tables carrying rows
pg_restore --list $latest | Select-String 'MATERIALIZED VIEW DATA'  # matviews are REFRESHed on restore
```

### 3. Restore into a fresh scratch DB

Run create → restore → count **in one shell session**: the local Docker stack can recreate
itself between calls and silently drop the scratch DB (see [Notes](#notes--gotchas)).

```powershell
$admin = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
$db    = "postgresql://postgres:postgres@127.0.0.1:54322/restore_drill"

psql $admin -v ON_ERROR_STOP=1 -c "drop database if exists restore_drill with (force);" -c "create database restore_drill;"
pg_restore --dbname=$db --no-owner --no-privileges $latest    # ~3 s
```

`pg_restore` exits non-zero on a handful of **benign, non-`public`** errors (a `realtime`
function that sets a superuser-only GUC, and `COPY vault.secrets`). These are expected on a
non-superuser restore and do **not** touch app data — see [Notes](#notes--gotchas). Confirm
no `public` table failed:

```powershell
pg_restore --dbname=$db --no-owner --no-privileges $latest 2> restore_stderr.log
Select-String -Path restore_stderr.log -Pattern 'error:'      # every hit must be non-public
```

### 4. Verify row counts vs prod

Count every `public` base table with one dynamic query (no hardcoded table list), run
identically against the restored DB and prod, then diff:

```sql
-- count.sql
select c.relname as t,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I', c.relname), false, true, '')))[1]::text::bigint as n
from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'public' and c.relkind = 'r'
order by 1;
```

```powershell
psql $db -A -F',' -t -f count.sql        # restored
```

Read prod with the same query via the Supabase MCP `execute_sql` (project
`anzcshrpfpxajcgrwczv`, **read-only**) or `psql` against the prod pooler.

**Expected:** every **gameplay** table matches exactly. **Append-only log tables**
(`cron_run_log`, `audit_log`, `notification_log`, `odds_api_responses`,
`espn_api_responses`) may show prod slightly _ahead_ if a cron ran after the snapshot —
reconcile any such gap to the dump timestamp (e.g. for `cron_run_log`, prod rows with
`started_at <= <dump UTC>` must equal the restored count). Any diff that is **not** newer
than the dump instant is a real fidelity failure and fails the drill.

### 5. Tear down

```powershell
psql $admin -c "drop database if exists restore_drill with (force);"
```

## Drill result — 2026-07-13

| Field                 | Value                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Dump                  | `supabase_20260713T152320Z_release_f2a34c5.dump`                                                  |
| Size / snapshot / rev | 1,381,480 bytes (≈1.32 MiB) · **2026-07-13 15:23:20 UTC** · commit `f2a34c5` (v3.4.0 pre-release) |
| Source                | `onedrive:supabase-backups/` via rclone (authoritative DR path)                                   |
| Target                | fresh scratch DB `restore_drill` in the local `supabase start` cluster (127.0.0.1:54322)          |
| Restore command       | `pg_restore --no-owner --no-privileges`                                                           |
| Restore wall time     | **~3.1 s**                                                                                        |
| Restore errors        | 2, both benign & non-`public` (`realtime.list_changes` GUC; `COPY vault.secrets`)                 |
| Matviews              | auto-`REFRESH`ed by the restore — e.g. `leaderboard_season_totals` = 23 rows                      |

**Row-count reconciliation — 28 of 29 `public` base tables matched exactly:**

| table              | restored |    prod | table                | restored | prod |
| ------------------ | -------: | ------: | -------------------- | -------: | ---: |
| picks              |     5228 |    5228 | groups               |        1 |    1 |
| pick_settlement    |     5442 |    5442 | group_config         |        1 |    1 |
| games              |     1409 |    1409 | group_invites        |        2 |    2 |
| game_lines         |     1311 |    1311 | group_week_overrides |        0 |    0 |
| weeks              |       97 |      97 | ai_badge_flavors     |       19 |   19 |
| seasons            |        5 |       5 | ai_recaps            |        1 |    1 |
| teams              |       32 |      32 | season_wrapped       |       27 |   27 |
| users              |        8 |       8 | recap_seen           |        0 |    0 |
| group_memberships  |        6 |       6 | comments             |        0 |    0 |
| push_subscriptions |        6 |       6 | reactions            |        0 |    0 |
| audit_log          |      191 |     191 | feedback             |        0 |    0 |
| espn_api_responses |        5 |       5 | notification_log     |        2 |    2 |
| odds_api_responses |        1 |       1 | results              |        0 |    0 |
| settings           |        1 |       1 | totals               |        0 |    0 |
| **cron_run_log**   |  **264** | **265** |                      |          |      |

The single diff — `cron_run_log` prod 265 vs restored 264 — is **fully explained**: prod
rows with `started_at <= 2026-07-13 15:23:20 UTC` = **264** (exact match to the restore),
and the one newer row is `id 265, job 'pregame', started_at 16:23:58 UTC` — the hourly
pre-game cron firing ~1 h _after_ the snapshot. Prod advanced by one append-only log row
after the backup was cut; the backup itself is a faithful point-in-time copy.

**Verdict: PASS — the latest off-platform dump restores cleanly with 0 unexplained drift.**

> Note: `badges` (named loosely in issue #604) is **not** a table — league badges are
> derived at runtime from picks + settlement, so there is nothing to back up or count.
> `results` / `totals` are legacy tables, empty by design (finals live on `games`).

## Recovery playbook (real incident)

- **Partial loss** (a dropped/corrupt table or bad rows — the likeliest mid-season case):
  restore the latest dump into a scratch DB exactly as above, then copy the good rows back
  into prod — e.g. `psql <scratch> -c "\copy (select … from public.<table>) to 'rows.csv' csv"`
  then `\copy public.<table> from 'rows.csv' csv` against prod (announce + confirm the prod
  write first, per repo policy).
- **Full loss** (prod project gone): provision a **new Supabase project on Postgres 17**,
  `pg_restore` the dump, re-point the app's Supabase env vars (Vercel Production) at the new
  project, redeploy, and `refresh materialized view` the stats/leaderboard matviews if the
  restore's auto-refresh was skipped. Then rotate keys and re-run this drill against the new
  project.

## RTO (recovery time objective)

At today's data volume the **mechanics are trivial** — pull ≈1.3 MiB (seconds) + restore
(~3 s) + verify (1–2 min). Real-world RTO is dominated by human decision and provisioning,
not the dump:

- **Partial-table recovery:** ≈ **5–10 min** end-to-end.
- **Full project rebuild:** ≈ **30–60 min**, dominated by creating a new Supabase project +
  re-pointing env vars + redeploy — not the restore itself.

Data growth over a season (picks/settlement) keeps restore in the seconds-to-low-minutes
range, so these RTOs hold through NFL 2026.

## Season-start: flip the backup cadence weekly → daily

The scheduled backup runs **weekly** in the offseason. At NFL season start, when weekly
picks make a day-level RPO worth the extra runs, flip it to **daily**: in
`.github/workflows/cron-backup.yml`, change the schedule from

```yaml
- cron: '0 8 * * 1' # weekly, Monday 08:00 UTC
```

to

```yaml
- cron: '0 8 * * *' # daily, 08:00 UTC
```

Commit on a branch → PR (no prod action needed; GitHub picks up the new schedule on merge).
Flip back to weekly after the season if desired. The 90-day retention prune already scales
with either cadence.

## Notes / gotchas

- **Benign restore errors are expected.** A non-superuser `pg_restore` of a full Supabase
  dump always fails on two non-`public` objects: `CREATE FUNCTION realtime.list_changes`
  (it `SET log_min_messages TO 'fatal'`, a superuser-only GUC) and `COPY vault.secrets`
  (Vault). Neither is app data. The drill passes as long as every `error:` line is
  non-`public`.
- **Restore into a target that already has the Supabase roles + extensions.** The dump is
  `--no-owner --no-privileges` (so ownership/ACLs are stripped), but RLS policies still say
  `TO authenticated` and functions reference `supabase_*` roles — the roles must pre-exist.
  A local `supabase start` cluster (or a real Supabase project) has them; a bare Postgres
  does not.
- **Matviews come back populated.** The dump includes `MATERIALIZED VIEW DATA` entries, so
  `pg_restore` `REFRESH`es the 16 stats/leaderboard matviews automatically — no manual
  refresh needed after a clean restore.
- **Run create + restore + count atomically.** The local Docker Supabase stack can recreate
  its `db` container mid-drill (observed 2026-07-13) and silently drop the scratch database
  between separate shell calls. Do all three in one session, and re-check that
  `restore_drill` still exists before trusting the counts.
- **Prod reads only.** The row-count diff reads prod; it never writes. Any real
  copy-back-to-prod recovery step is a prod write — announce it and get explicit sign-off
  first.
