# Scaling signals — what "measured scale" means

`ROADMAP.md` ("Off the dated roadmap" → Scaling) and ADR-0002 defer infrastructure
work to **measured scale** without saying what is measured or when a threshold is
crossed. This document fills that gap: it names the baseline signals, where each is
read, and the directional thresholds that should trigger the next tier of scaling
work. It is the durable companion to the observability wiring added for issue #190.

The thresholds below are **directional heuristics** to be calibrated against the first
real season's baseline — they are starting lines, not SLOs. Update the numbers here
when the season-one data lands; keep the _sources_ stable.

## Signals and where to read them

| Signal                        | Source                                                                                           | How to read it                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| SSR p50/p95 — leaderboard     | Sentry span `load leaderboard`                                                                   | Sentry → Performance, filter by transaction/span name |
| SSR p50/p95 — stats           | Sentry span `load stats`                                                                         | "                                                     |
| SSR p50/p95 — picks           | Sentry span `load picks`                                                                         | "                                                     |
| Per-request auth-hook DB cost | Sentry span `auth-hook.db` (+ children `auth-hook.users-profile`, `auth-hook.group-memberships`) | "                                                     |
| Notification-cron duration    | `cron_run_log` (job `pregame`) → admin **Scaling signals** card                                  | `/admin` — no SQL needed                              |
| Odds API monthly usage vs cap | `settings.odds_api_calls_used_current_month` / `odds_api_monthly_cap` → admin **Odds sync** card | `/admin` — no SQL needed                              |

Spans are emitted via `src/lib/server/observability.ts` on top of SvelteKit's
experimental server tracing/instrumentation (`svelte.config.js`) into the existing
Sentry project (`src/instrumentation.server.ts`). No new vendor or tables.

## Trigger thresholds

### Tier A — response caching for hot reads

**Metric source:** Sentry SSR p95 for `load leaderboard` / `load stats` / `load picks`,
and the `auth-hook.db` span.

**Trigger (directional):**

- Hot-page SSR **p95 > ~800 ms sustained** across a game-day window, **or**
- auth-hook DB span **p95 > ~150 ms** (it runs on every authenticated request).

**Response:** cache the hot read paths (the companion "cache hot reads" issue);
re-measure the same spans before/after to confirm the win.

### Tier B — notifications off the request path / materialized views

**Metric source (hard trigger):** `cron_run_log` job `pregame` duration vs the Vercel
function timeout (`VERCEL_FUNCTION_TIMEOUT_SECONDS`, currently 300 s — the platform
default, since no `maxDuration` is set in `vercel.json`). Surfaced on the `/admin`
**Scaling signals** card as headroom %.

**Trigger:** notification-cron **headroom ≤ 50 %** of the function timeout (i.e. a run
consumes half the budget or more). This is the one hard trigger — a run that exceeds
the timeout drops reminders silently.

**Response:** move the reminder fan-out to a background/queue path; consider
materialized leaderboard/stats views if their queries dominate the hot-page p95.

### Odds API budget

**Metric source:** `settings` usage vs cap on the `/admin` Odds sync card.

**Trigger:** sustained **> ~80 % of the monthly cap** before month-end → widen the
cap-guard proximity window or raise the cap.

## Guardrail alignment

Per `ROADMAP.md` "Architectural guardrails," infrastructure (queues, replicas,
hosting) is revisited only from measurements. These signals _are_ those measurements;
crossing a Tier threshold is the precondition for opening the corresponding scaling
issue (and, where a guardrail changes, the superseding ADR). Relates to ADR-0002.
