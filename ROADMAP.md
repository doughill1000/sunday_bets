# Roadmap — 2026 offseason → Week 1 (September 2026)

Phase 1 (bug fixes, dead code, dep cleanup, admin-auth unification, Odds API
quota tracking, docs) shipped in June 2026. What follows is the plan for the
rest of the offseason, in order. Each phase is independently shippable.

## Versioning

Each phase ships as a minor version bump. Phase 6 (season launch) is the v2.0
milestone. Hotfixes within a phase use patch versions (e.g. v1.3.1).

| Version | Milestone |
|---------|-----------|
| v1.1    | Pre-roadmap baseline |
| v1.2    | Phase 1 — shipped June 2026 |
| v1.3    | Phase 2 — shipped June 2026 |
| v1.4    | Phase 3 — Automation (crons) |
| v1.5    | Phase 4 — Push notifications |
| v1.6    | Phase 5 — Stats & history |
| v2.0    | Phase 6 — Social + Week 1 launch |

## Phase 2 — E2E safety net + finish the Svelte 5 migration — v1.3 ✅ shipped June 2026

E2E tests come **first** so the component migration has a regression net.

- Playwright smoke tests in `tests/e2e/` (the configured dir currently has
  none, so `playwright.yml` passes vacuously): sign-in/session flow, make-a-pick
  flow, leaderboard render. Fail CI when zero tests are collected.
- Migrate remaining Svelte 4 components to runes, simplest first:
  `WeightChip`/`ResultChip`/`WeightSelect`/`TeamSelect` →
  `GameCard`/`LockControls`/`PicksBoard` → page components → `AppHeader` last.
  Keep `src/lib/stores/picks.ts` as a writable store until e2e covers the
  optimistic lock/unlock flow.
- pgTAP coverage beyond `is_admin`: `lock_pick` (post-kickoff rejection,
  All-In weekly limit), `grade_pick` (win/loss/push/missed math).
- ESLint: 181 pre-existing `@typescript-eslint/no-explicit-any` errors
  (prettier passes; CI never ran lint). Decide per area: fix in `src/`,
  disable the rule for test files where `as any` mocks are idiomatic.
- **Bug: iPhone PWA auth state lost on relaunch — ✅ audited, no code fix
  needed.** Symptom: installed as a PWA on iOS and launched from the home
  screen, the session was reported lost and the user had to log in every time.
  Root cause: WebKit's partitioned storage in standalone PWA mode discards
  localStorage between launches, so a localStorage-backed session is dropped;
  the session must live in cookies so `src/hooks.server.ts` can restore it on
  the next server-side request. Audit outcome: every Supabase client already
  uses `@supabase/ssr` cookie storage — no call site passes `storage:
  localStorage`, `createBrowserClient` defaults to a 400-day persistent cookie,
  and all auth mutations run server-side through `locals.supabase` so the cookie
  is set via `hooks.server.ts`'s `setAll`. Added regression coverage in
  `tests/e2e/session-persistence.spec.ts` (persistent-cookie-not-localStorage
  assertion + a simulated iOS PWA cold-relaunch using a fresh context seeded
  with persistent cookies only).
- **Supabase API key migration** — Supabase has replaced legacy JWT-based
  `anon` / `service_role` keys with new `sb_publishable_*` / `sb_secret_*`
  keys (legacy deprecated end of 2026). Steps:
  1. Generate new keys in Supabase dashboard → Settings → API Keys for both
     staging and production projects.
  2. Update `.env.staging` and `.env.production` values (env var names
     `PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE` can stay; only the
     key values change). Update `.env.example` comment to note new format.
  3. Rotate the matching Vercel env vars and GitHub Actions secrets for both
     environments.
  4. The `supabase-js` SDK accepts the new key format transparently — no code
     changes needed in `src/hooks.server.ts` or `src/lib/supabase/service.ts`.

## Phase 3 — Automation: the app runs itself (late July–August) — v1.4

**Architecture: `CRON_SECRET`-protected SvelteKit endpoints, scheduled by
GitHub Actions cron workflows** (already-used infra, free, flexible cadence;
Vercel Hobby cron allows only 2 once-daily jobs). If we later move to Vercel
Pro, only the scheduler changes.

- `POST /api/cron/sync-odds` — wraps `syncOddsForActiveWeek()`.
  Schedule: daily Tue–Sat ~14:00 UTC.
- `POST /api/cron/grade` — refresh scores (`fetchNFLScores`, `daysFrom=3`) +
  `grade_week` RPC (both already idempotent). Schedule: hourly Sun
  21:00–Mon 06:00 UTC, plus Tue 09:00 UTC catch-all → results post the same
  night games finish.
- `POST /api/cron/rollover-week` — new DB function `advance_week_if_complete()`
  (all non-postponed games have final scores + settlements → advance
  `weeks.is_active`). Schedule: Tue, after grade.
- All cron endpoints: check `Authorization: Bearer $CRON_SECRET`, write to a
  new `cron_run_log` table (admin-only RLS), `Sentry.captureException` on
  caught errors. Show recent runs on the admin page.
- Monthly reset function for `settings.odds_api_calls_used_current_month`.

## Phase 4 — Push notifications (August) — v1.5

- Keep the `generateSW` PWA strategy; add push/notificationclick handlers via
  `workbox.importScripts` → `static/push-handler.js`.
- New `push_subscriptions` table (endpoint unique, p256dh, auth_key; RLS
  own-rows-only) + `notification_prefs` jsonb on `users`.
- `web-push` + VAPID env keys; `src/lib/server/push.ts` `sendToUser()` pruning
  dead subscriptions on 404/410. `POST/DELETE /api/push/subscribe` + a toggle
  on a new `/settings` page (iOS needs 16.4+ and home-screen install).
- Triggers from Phase 3 crons: pick reminders (Thu sync: users with unpicked
  games <48h out), results summary after a successful grade run. Admin "send
  test notification" button.

## Phase 5 — Stats & history + DevOps cleanup (August) — v1.6

- **Branching strategy migration** — drop the long-lived `develop` branch; PRs
  target `main` directly, using Vercel preview deployments for per-PR staging.
  Steps: update `ci-tests.yml` branch targets, update branch protection rules,
  repurpose or remove the staging Vercel project, update `CLAUDE.md` branching
  convention. Low-medium LoE (~1h), no user-facing impact.
- Four SQL views over `pick_settlement` in `supabase/src/views/`:
  `stats_head_to_head`, `stats_accuracy_by_team`, `stats_accuracy_by_weight`
  (All-In record), `stats_season_trend` (cumulative points/week —
  `getWeeklyCumulative()` in `src/lib/server/db/queries/leaderboard.ts` already
  queries the existing weekly view and is waiting for a consumer).
- New `/(app)/stats` route; charts via LayerChart.

## Phase 6 — Social + pre-season polish (late August → Week 1) — v2.0

- Game-scoped `comments` table (≤500 chars; RLS: write own anytime, **read only
  after `game_has_started(game_id)`** → sealed-envelope trash talk revealed at
  kickoff) + `reactions` (curated emoji set). Supabase Realtime channel per
  visible game card.
- Surface other players' picks in the game UI post-kickoff (RLS already
  permits it via `sel_picks_owner_or_started`).
- **Username + password auth** — add email/password as an auth method alongside
  the existing magic-link flow. Supabase Auth already supports it; steps:
  1. Enable "Email provider → Password sign-in" in Supabase Auth settings.
  2. Add a password sign-up/sign-in form to the login page (toggle or tabs).
  3. Password reset via "Forgot password" → `supabase.auth.resetPasswordForEmail`
     → redirect to a `/auth/reset` route that calls `updateUser`.
  4. Add to e2e smoke suite: sign-up, sign-in, reset flow.
  5. Existing magic-link users can set a password via the same reset flow; no
     migration needed (Supabase links by email).
- Season-start checklist: seed 2026 season/weeks (seeding is manual;
  `seed/002_season_and_weeks.sql` is commented out), verify crons, check Odds
  API quota, full Playwright suite green.

## Cross-cutting: new tables and the Data API

Supabase no longer auto-exposes new `public` schema tables to the Data (REST)
and GraphQL APIs. Every new table added in Phase 3+ must include explicit
grants and RLS before the app can query it through the client:

```sql
-- required alongside CREATE TABLE for any Data API-accessible table
grant select, insert, update, delete on <table> to authenticated;
alter table <table> enable row level security;
-- then add policies as appropriate
```

Affected tables by phase: `cron_run_log` (Phase 3), `push_subscriptions` /
`notification_prefs` (Phase 4), `comments` / `reactions` (Phase 6). Tables
only accessed server-side via the secret key (service role) bypass RLS anyway,
but the grant is still needed for the Data API path.

## Parked

- Backfill scripts (`supabase/scripts/backfill-picks/`): hardcoded xlsx path +
  player UUIDs; delete once the 2025 backfill is confirmed done (removes the
  vulnerable `xlsx` dep with it).
- Legacy `results`/`totals` tables: superseded by `pick_settlement`; confirm
  nothing reads them, then drop.
- Migration-generator rework: high risk, low reward — instead, follow the
  "don't rename SQL sources" rule in README.
- CI: `ci-tests.yml` only runs unit tests on PRs to `develop`; widen when
  touching workflows in Phase 3.
