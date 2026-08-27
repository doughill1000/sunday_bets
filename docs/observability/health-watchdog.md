# Health watchdog — free cron missed-run + stale-data detection

The seven GitHub Actions crons already alert on **failure** (a non-2xx response makes
the workflow `exit 1`, which emails via GitHub Actions notifications). They did not
alert on a **missed run** — a workflow disabled after ~60 days idle, a removed
schedule, or a GitHub Actions outage. Sentry Cron Monitors would fill that gap, but
the free tier allows only **one** monitor. This watchdog covers all seven for $0, and
additionally catches the one stale-data case cron-liveness alone misses (odds sync
halted at the monthly cap). Issue #206.

No ADR: this is observability wiring — a read-only, token-guarded endpoint with no
data-model, security-boundary, or gameplay change — directly analogous to the
scaling-signals baseline (#190), which was documented here rather than in an ADR.

## How it works

`GET /api/health?token=…` returns the whole-system health report:

- `200 {status:"ok", …}` — every scheduled cron ran on time and odds sync is under cap.
- `503 {status:"degraded", stale:[…], …}` — a run is overdue or sync is at/over cap.

An external uptime monitor (UptimeRobot / Better Stack free tier) polls it every few
minutes and emails when it flips to `503`. A connection error / 5xx straight from the
platform covers the whole-site-down case (which Sentry, only seeing code that runs,
cannot).

The endpoint lives under `/api` (not the auth-guarded `(app)` group) so it is
reachable without a session, and is token-guarded by `HEALTH_CHECK_TOKEN` (constant-
time compare, fails closed when unset — mirrors `requireCronSecret`).

### Missed-run logic is schedule-aware

`src/lib/server/cronHealth.ts` (pure, unit-tested) computes each job's most recent
**expected fire time** from its schedule, then flags it overdue when that time has
passed by more than a margin **and** no successful run landed after it. Because it
knows the schedule — not just "age of last run" — it flags a missed weekly or
monthly run within the margin of its scheduled time, the same way a Sentry monitor
would. The latest successful run per job comes from `cron_run_log` via
`getLatestCronSuccesses` (one small lookup per job).

Schedules and margins live in `CRON_SCHEDULES`. **Margins are deliberately generous**
(45 min hourly, 60 min weekly, 180 min monthly) — GitHub Actions scheduled runs are
routinely 10–30 min late under load, so tight margins would false-positive. A truly
missed run is hours/days late, so a generous margin only delays a real alert by the
margin; it never hides a real miss. (These are _not_ the tight check-in margins from
the retired Sentry-monitor plan, which don't apply to external polling.)

### Odds usage check

`sync-odds` logs a "success" even when it is blocked by the monthly Odds API cap
(`canSyncNow` returns false without throwing), so cron-liveness alone would stay
green while lines silently stop refreshing. The report therefore also compares
`settings.odds_api_calls_used_current_month` against `odds_api_monthly_cap`: at/over
the cap degrades the status; within 90% is surfaced as `nearCap` (informational,
does not degrade).

## Operator setup (one-time)

1. **Set `HEALTH_CHECK_TOKEN`** in Vercel (Production + Preview) to a random string.
   Add it to local `.env` for testing. See `.env.example`.
2. **Add an external monitor** (UptimeRobot / Better Stack, free) on
   `https://<prod-domain>/api/health?token=<HEALTH_CHECK_TOKEN>`, ~5-min interval.
   Set its "confirm for N minutes" / retries option to ~15 min so momentary GitHub
   scheduler jitter never pages. Alert on any non-2xx.
3. **Turn on GitHub Actions failure email:** GitHub → Settings → Notifications →
   Actions → "Send notifications for failed workflows only". Covers the ran-but-
   errored class without any Sentry monitor.
4. **Move the one free Sentry cron monitor** from `rollover-week` to
   `reset-odds-usage` — an independent backup on the highest-consequence job (a
   silently missed monthly reset disables odds sync for a whole month).
5. **Add the stale-read-model Sentry alert** (#623) — see below.

## Coverage after this ships (all $0)

| Failure class                | Caught by                                             |
| ---------------------------- | ----------------------------------------------------- |
| Cron ran but errored         | GitHub Actions failure email (`exit 1`)               |
| Cron didn't run / disabled   | Watchdog endpoint + external monitor                  |
| Site down / DB unreachable   | Same monitor (non-2xx / connection error)             |
| Odds sync halted at cap      | Watchdog odds-usage check                             |
| App crash / bug              | Sentry errors (free tier, unchanged)                  |
| Monthly reset silently fails | Watchdog **and** the one free Sentry cron monitor     |
| Read models silently stale   | `cron_run_log.summary` + /admin, plus the alert below |

## Stale read models — the green-but-wrong class (#623)

The grade cron's two post-grade read-model rebuilds — the leaderboard/stats matviews
(ADR-0013) and the credibility ratings (ADR-0032 §8) — are **best-effort by design**:
settlement has already committed, so a refresh failure is logged and swallowed rather
than rolling the grade back, and the stale snapshot self-heals on the next grade. The
cost is that the grade job returns **HTTP 200** with `cron_run_log.ok = true` and a
green watchdog even when the leaderboard everyone reads is stale. Nothing above catches
this: every signal in the table is about a job that _ran and failed_, and by contract
this one didn't fail.

Two independent things close it, and neither changes the best-effort contract:

**1. The run reports its own outcome.** The grade job folds each step into its summary,
which `withCronLog` persists to `cron_run_log.summary`:

```json
"readModels": {
  "leaderboardStats": { "ok": true },
  "playerRatings": { "ok": false, "error": "rating inputs unavailable" }
}
```

`/admin` reads it back (`staleReadModels`) and renders such a run as **`ok · stale
reads`** with the failing step named, so the degradation is visible on the same card
that already shows the run. Rows written before #623 carry no `readModels` key and read
as non-degraded — absent is not the same as healthy.

**2. A Sentry alert makes it push, not pull.** The card only helps someone who opens it.
Both steps already tag their capture, so no code is needed — create one issue alert in
Sentry:

- **When:** a new issue is created, **or** an issue is seen again (so a recurring stale
  refresh re-alerts rather than staying quietly resolved).
- **If:** the event's `step` tag equals `refresh_leaderboard_stats` **or**
  `rebuild_player_ratings` (one rule with two conditions, `any` match). Both also carry
  `area: grading`.
- **Then:** email. Rate-limit to one notification per hour — a failing refresh recurs on
  every grade tick.

Verify it once by triggering a real event rather than trusting the rule text: break a
matview dependency on a preview DB, run `grade` via `workflow_dispatch`, and confirm all
three of the email, the `cron_run_log.summary`, and the `/admin` card — while the
settlement rows still land.

## Sentry free-tier tuning (shipped with #206)

To stay within the free quota so Sentry doesn't silently drop events mid-season
(`src/hooks.client.ts`, `src/instrumentation.server.ts`):

- `tracesSampleRate` 1.0 → **0.1** (error capture is unaffected — every crash is
  still reported).
- Session Replay → on-error only (`replaysSessionSampleRate: 0`,
  `replaysOnErrorSampleRate: 1.0`).
- `enableLogs: false` (Sentry Logs is a separate quota; `cron_run_log` + Vercel logs
  already cover it).

## Caveat — intentional offseason pause

The watchdog assumes the crons are scheduled to run. If they are intentionally
disabled during a long offseason, pause the external monitor too, or it will report
`degraded`. See the `season-ops` skill for the seasonal cron posture.
