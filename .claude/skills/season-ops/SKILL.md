---
name: season-ops
description: Read-only operational check across the seven production cron jobs, odds-API quota, matview freshness, and schedule sync — two modes, "readiness" (pre-season dry-run) and "week-health" (in-season, did everything run this week). Use when Doug asks "are we ready for the season", "is everything running", "check the crons", or wants a weekly operational health check. Does not fix anything itself — surfaces findings for a human or a follow-up fix.
---

# Season operations check

Sunday Bets runs on seven scheduled GitHub Actions crons hitting production endpoints,
plus event-driven matview refresh. Nothing here is exercised meaningfully in the
off-season, so drift (a disabled workflow, an expired secret, a quota near its cap) is
invisible until the first real Sunday exposes it. This skill is the read-only check
that catches that drift **before** or **during** the season instead of after a missed
grade. It never writes anything — findings go back to Doug or a follow-up fix.

## The seven crons (`.github/workflows/cron-*.yml` → `_cron-call.yml` → `/api/cron/<endpoint>`)

| Workflow                    | Schedule (UTC)                                  | Endpoint           | Sentry monitor slug |
| --------------------------- | ----------------------------------------------- | ------------------ | ------------------- |
| `cron-pregame.yml`          | hourly                                          | `pregame`          | `pregame`           |
| `cron-sync-odds.yml`        | 14:00 Tue–Sat                                   | `sync-odds`        | `sync-odds`         |
| `cron-sync-schedule.yml`    | 15:00 Tue                                       | `sync-schedule`    | `sync-schedule`     |
| `cron-grade.yml`            | 4h Sun, 21–23h Sun, 0–6h Mon, 5h Fri, 5h+9h Tue | `grade`            | `grade`             |
| `cron-weekly-recap.yml`     | 14:00 Tue                                       | `weekly-recap`     | `weekly-recap`      |
| `cron-rollover-week.yml`    | 10:00 Tue                                       | `rollover-week`    | `rollover-week`     |
| `cron-reset-odds-usage.yml` | 00:05, 1st of month                             | `reset-odds-usage` | `reset-odds-usage`  |

Each POSTs to `${DEPLOY_URL}/api/cron/<endpoint>` with a `CRON_SECRET` bearer token and
an optional Sentry Cron Monitor check-in (best-effort, only fires if
`SENTRY_CRON_INGEST_URL`/`SENTRY_CRON_KEY` are set — they are, as Production
environment secrets). Every run writes a row to `public.cron_run_log` (`job`,
`started_at`, `finished_at`, `ok`, `summary`, `error`) — surfaced on `/admin` via
`getRecentCronRuns()`.

**Matviews do not have their own schedule.** `leaderboard_season_totals` and the seven
`stats_*` views refresh automatically at the end of every grading run
(`refresh_leaderboard_stats()`, called from `src/lib/server/grading.ts` post-commit —
ADR-0013), plus after `update_group_config`. A refresh failure is logged to **Sentry
only** and does not fail the grade or show up in `cron_run_log` — so a green `grade`
cron does NOT guarantee the matviews actually refreshed; check Sentry for
`refresh_leaderboard_stats` errors specifically if the leaderboard looks stale despite
a green grade.

## Readiness mode (pre-season dry-run)

1. **Workflows are enabled and scheduled.**
   ```powershell
   gh workflow list --repo doughill1000/sunday_bets --all
   ```
   Confirm all seven `cron-*.yml` show `active`, not `disabled_manually` (GitHub
   auto-disables scheduled workflows after ~60 days of repo inactivity — a real risk
   after an off-season).
2. **Production secrets/vars exist.**
   ```powershell
   gh api repos/doughill1000/sunday_bets/environments/Production/secrets --jq '.secrets[].name'
   gh api repos/doughill1000/sunday_bets/environments/Production/variables --jq '.variables[].name'
   ```
   Expect `CRON_SECRET`, `SENTRY_CRON_INGEST_URL`, `SENTRY_CRON_KEY`,
   `PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_DB_URL`,
   `SUPABASE_STAGING_DB_URL`, `RCLONE_CONFIG_B64` (secrets) and `DEPLOY_URL`
   (variable). `ODDS_API_KEY1`/`ODDS_API_KEY2` are **not** here — they're Vercel app
   env vars, not GitHub Actions secrets; check the Vercel project directly.
3. **Schedule is synced for the correct season/year.** Query the current `weeks`/`games`
   rows and confirm they're the **upcoming** season, not a stale prior one — ESPN's
   scoreboard endpoint ignores a bare `season=` param and silently returns the _current_
   season instead (caused #272's bogus-season bug); ensure `sync-schedule` used a
   `dates=<year>` call.
4. **Odds quota has headroom** before the season's daily `sync-odds` cadence starts —
   check the usage figures the `/admin` page reads from `src/lib/server/settings.ts`.
5. **No open advisories:** `mcp__supabase__get_advisors` (security + performance).
6. **Push path alive:** VAPID keys present (step 2) and at least one recent successful
   push send if any test notification has gone out.

## Week-health mode (in-season)

1. **Cross-check GitHub Actions against `cron_run_log` — don't trust either alone.** A
   row in `cron_run_log` only exists if the endpoint was actually invoked; if the GitHub
   Actions job itself failed before the HTTP call (bad secret, workflow syntax error,
   GitHub auto-disable), there's **no row at all**, which looks identical to "nothing
   scheduled this week" unless you also check Actions:
   ```powershell
   gh run list --repo doughill1000/sunday_bets --workflow=cron-grade.yml --limit 5
   # repeat per cron-*.yml, or gh api the environment for a faster combined view
   ```
   Then query `cron_run_log` (via `mcp__supabase__execute_sql` or the `/admin` page)
   for each job's most recent `started_at`/`ok`/`error` and confirm it lines up with the
   schedule table above (e.g. a missing `grade` row across a whole Sunday–Tuesday window
   is a real gap, not noise).
2. **Grading actually produced settlements**, not just a 200: spot-check that the week's
   games have `final_scores` and matching `pick_settlement` rows.
3. **Matview freshness via Sentry, not `cron_run_log`** (see note above) — search for
   `refresh_leaderboard_stats` errors since the last grade. Use
   `mcp__sentry__search_issues` / `mcp__sentry__search_events` (resolve the org/project
   first with `mcp__sentry__find_organizations` / `find_projects` if not already known
   in this session).
4. **Odds quota trend** — confirm usage is tracking toward, not past, the monthly cap
   ahead of `reset-odds-usage`'s reset on the 1st.
5. **Any new Sentry issues** touching the cron endpoints or `src/lib/server/odds.ts`
   since the last check.

## Remember

- **Read-only.** This skill diagnoses; it does not restart workflows, rotate secrets,
  or trigger a manual cron run. If something's broken, say what and where, and let Doug
  (or a follow-up fix) decide the remedy.
- **A green `grade` cron is necessary but not sufficient** for "the leaderboard is
  correct this week" — the matview refresh can fail silently. Always check Sentry too
  during week-health.
- Don't hardcode season dates into this skill — derive "is this the season" from
  `weeks`/`games` table state, not a memorized kickoff date, so it stays correct across
  years without editing.
- If a finding is CI/workflow-shaped (a red check, not an ops question), that's
  `ci-triage`'s job, not this skill's.

## See also

- `.github/workflows/_cron-call.yml` (the shared caller), `.github/workflows/cron-*.yml`
  (the seven schedules)
- `docs/adr/0013-materialized-leaderboard-stats.md` (matview refresh contract)
- `src/routes/(app)/admin/+page.server.ts` (the human-facing view of the same data)
- Could be wired to a recurring check (e.g. the `loop`/`schedule` skills) for a Monday
  morning in-season habit — not set up automatically here.
- Found a problem that needs a prod write to fix (not just a flag/report)? That's
  `prod-backfill`, not this skill — this one stays read-only.
