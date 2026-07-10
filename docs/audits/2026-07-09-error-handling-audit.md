# Error-handling audit — 2026-07-09

Repo-wide audit of how the app behaves **when something breaks**, with the focus Doug
asked for: the _user-facing_ experience, not just server logs. A three-lane subagent
sweep (client/UI, server/API, observability) plus direct end-to-end verification of the
core pick-mutation path. This is a behaviour audit (what happens on failure), a sibling
to the [pattern audits](2026-07-02-pattern-audit.md) rather than a maturity grading.

- **HEAD at audit time:** `b64ea8b` on `origin/master` (fix delivered rebased onto
  `3fac645`; line anchors below reflect that base).
- **Remediation branch:** `fix/error-handling-p0-p1` (this change) fixes the P0 and the
  two P1s; the P2/P3 items below are captured as a backlog, not fixed here.
- **Context:** the app is pre-season / not in active use, so the P0 is not currently
  hitting real users — but it sits on the single most-used gameplay action.

## Executive summary

Error _monitoring_ is in good shape: Sentry is initialised on all three surfaces
(`src/hooks.client.ts`, `src/instrumentation.server.ts`, `src/hooks.server.ts`), cron
runs are bulk-headed per stage and logged to `cron_run_log`, and grading/push/schedule
paths already `Sentry.captureException`. Reads, auth, and the join flow degrade
reasonably.

The gap is the **user-facing "something broke" floor**, and it had one confirmed
shipping bug:

1. **P0 — the core "Lock in" action hangs silently on any failure.** The client pick
   wrapper let a non-2xx response reject a promise the store never catches, so the
   button stuck on "Locking in…" forever with no message and no retry.
2. **P1 — 500s leaked the raw Postgres message _and_ never reached Sentry.** The
   mutation routes `throw error(500, dbError.message)`; `error()` throws an `HttpError`
   that bypasses `handleError`, so those 500s were both a data-leak and a monitoring
   blind spot.
3. **P1 — there was no error page anywhere.** No `+error.svelte`, no `App.Error`
   shaping, so any unhandled load error or `throw error(403)` dropped the user onto
   SvelteKit's bare, light-mode default page (the app is always-dark).

All three are fixed in this pass. The rest (timeouts, silent-default swallowing, a few
`console.error`-only sites) are real but lower-severity and listed as a backlog below.

## What the user sees when X breaks

| Failure                                        | Before                                                                    | After                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lock a pick after kickoff / line moved (409)   | Button stuck on "Locking in…" forever, no message                         | Button re-enables, toast + inline "Couldn't lock in — tap to retry"         |
| Lock/unlock hits a DB error (500)              | Same silent hang; raw Postgres string in the response body; not in Sentry | Friendly reason surfaced; generic 500 body; real error captured in Sentry   |
| Comment/reaction write hits a DB error (500)   | Raw Postgres string returned; not in Sentry                               | Generic `{ok:false, reason}`; real error captured in Sentry                 |
| Non-admin opens `/admin` (`throw error(403)`)  | Bare, unstyled, light-mode SvelteKit fallback                             | Branded dark error page: "You don't have access", home + retry actions      |
| Unknown URL (404) / unhandled load error (500) | Same bare fallback                                                        | Same branded error page, headline varied by status                          |
| Auth-hook DB read fails (DB outage)            | Every request 500s onto the bare fallback (unchanged — see P2)            | Now at least lands on the branded error page; still no graceful degradation |

## Findings by layer

### Client / UI

- **[P0 — FIXED] Pick lock/unlock silent hang.** `apiCall`
  (`src/lib/api/index.ts:13`) throws on any non-2xx. The picks route returns **409** for
  every expected failure (line moved, game started, All-In already used, all-groups
  failed) and **500** for DB errors. But `src/lib/api/picks.ts` returned the raw
  throwing promise, and the store's `lockPick` (`src/lib/stores/picks.ts:87`) awaits it
  with **no try/catch**, so its `if (!result.ok)` recovery branch
  (`src/lib/stores/picks.ts:94`, which sets `saveState:'error'`) was unreachable →
  `saveState` stayed `'saving'` → `LockControls.svelte:52` kept the button disabled on
  "Locking in…" forever. `onLock` (`LockControls.svelte:21-24`) didn't catch either.
  Same dead-code recovery for `unlockPick` (`WeightSelect.svelte:84-98`,
  `LockedPicksSection.svelte:64-79`). The store unit tests
  (`src/lib/stores/__tests__/picks.test.ts`) mocked `$lib/api/picks.lockPick` to
  _resolve_ `{ok:false}` — which the real HTTP path never did — masking the mismatch.
  **Fix:** `src/lib/api/picks.ts` now catches and returns `{ok:false, reason}`, matching
  the store's contract; a new `src/lib/api/__tests__/picks.test.ts` drives the real
  wrapper against a mocked 409/500/200 fetch so this can't regress.

- **[P2 — deferred] Two competing failure-surface conventions.** Some flows toast
  (`LockControls`, `WeightSelect`, `LockedPicksSection`), others render inline status
  banners (the `{kind, text}` blocks flagged in the 2026-07-02 pattern audit). No single
  rule for when a failure is a toast vs. a banner vs. inline text. Fold into the
  `useAsyncAction()` / `<StatusMessage>` extraction already recommended there.

- **[P3 — deferred] Read-oriented components have no explicit error branch.**
  `GroupSwitcher` and `EngagementBanner` render off data with no failure state; they
  rely on the parent load succeeding. Low-risk today, but a failed refresh shows nothing
  rather than a hint.

### Server / API

- **[P1 — FIXED] Raw-message leak + monitoring blind spot on 500s.**
  `throw error(500, dbError.message)` in the three mutation routes sent the **raw
  Postgres string** in the 500 body, and because `error()` throws an `HttpError`,
  `handleError` (and therefore Sentry) was skipped entirely. Sites (pre-fix):
  `api/picks/[gameId]/+server.ts:55,95`, `api/comments/[gameId]/+server.ts:32,53`,
  `api/reactions/[gameId]/+server.ts:36,66`. **Fix:** each now
  `Sentry.captureException(error)` + returns the app-standard
  `{ok:false, reason:'Something went wrong. Please try again.'}` at 500 — no leak, the
  error is captured, and the shape stays consistent with the 409 branches (which also
  lets the Change-1 client wrapper surface a clean reason). The 409/403/23505 branches
  are unchanged.

- **[P2 — deferred] Auth hook has no failure handling → whole-app 500 on a DB blip.**
  `injectSession` (`src/hooks.server.ts:116`) does two service-role reads via
  `getAuthContext` with no try/catch. If either throws (transient DB outage), it
  propagates and **every** request 500s — there is no "degrade to logged-out shell"
  path. After this change it at least lands on the branded error page, but graceful
  degradation (treat as unauthenticated, show a banner) is the real fix.

- **[P3 — deferred] `admin.ts` swallows DB errors into plausible defaults.**
  `src/lib/server/admin.ts:37-41,52-57` falls back to `cap:1000, used:0` /
  `finalWeekUnlimitedAllin:true` on any query error with **no** `Sentry.captureException`
  — a real outage is masked behind a normal-looking value. (Also noted P3 in the
  2026-07-02 pattern audit.) Add a capture on the error branch.

- **[P3 — deferred] No timeout on outbound Odds/ESPN fetches.**
  `src/lib/server/odds.ts:76,96` (and the ESPN score fetch in `grading.ts`) call
  `fetch(url)` with no `AbortSignal.timeout`, so a hung upstream can stall a cron stage
  until the platform timeout. Wrap with a bounded `AbortSignal.timeout(...)`.

- **[P3 — deferred] Inconsistent error contract between read and mutation routes.**
  Read routes like `api/leaderboard/+server.ts` and `api/stats` have no explicit error
  branch — a thrown read surfaces as a bare 500 caught by TanStack Query's error state —
  whereas mutation routes return `{ok:false, reason}`. Harmless today (reads have SSR
  `initialData` fallbacks) but worth a documented convention.

### Observability

- **[Strength] Monitoring floor is solid.** Sentry on all three surfaces;
  `tracesSampleRate: 1.0`, `enableLogs`, replay on the client; cron stages bulk-headed
  and logged to `cron_run_log`; grading/push/schedule already capture. The narrow
  `traceSpan`/`traceDbQuery` instrumentation (ADR-0014, issue #190) is intact.

- **[P1 — FIXED, cross-listed] `HttpError` 500s bypassed `handleError`.** See the
  server P1 above — this was the single biggest observability hole: the exact errors
  most worth alerting on (unexpected DB failures on writes) were the ones Sentry never
  saw. Now captured explicitly at the source.

- **[P3 — deferred] AI-gateway credential failure is invisible.** A missing/invalid
  AI Gateway key surfaces only as a failed recap with no distinct capture/alert; the
  deterministic fallback (ADR-0008) hides it from users but also from us.

- **[P3 — deferred] `console.error`-only sites.** A handful of catch blocks log to the
  console without a Sentry capture, so they never alert in production. Sweep and add
  captures (or justify the omission inline).

## Fixed in this pass

1. **Client pick contract normalised** — `src/lib/api/picks.ts` catches non-2xx and
   returns `{ok:false, reason}` so the store's existing recovery + rollback fires and
   the "Lock in" button re-enables with a reason instead of hanging. Repairs the lock
   site and both unlock sites in one place. (`apiCall` itself is unchanged — throw-on-
   non-2xx is correct for the many callers that already `try/catch`.)
2. **500 leak closed + captured** — `picks` / `comments` / `reactions` routes now
   `Sentry.captureException(error)` and return a generic `{ok:false, reason}` 500 body.
3. **Branded root error page** — `src/routes/+error.svelte`, always-dark, reuses
   `buttonVariants` and brand tokens, headline varied by status (403/404/401/else), with
   home + retry actions. Client (4xx) error messages are surfaced; 5xx detail is kept
   generic (raw cause lives in Sentry).
4. **Regression guard** — `src/lib/api/__tests__/picks.test.ts` asserts `lockPick` /
   `unlockPick` **resolve** `{ok:false, reason}` (never throw) on 409/500 — the test
   that would have caught the P0.

## Deferred / recommended next

Priority order for a follow-up pass:

- **P2** Graceful degradation in `injectSession` when the auth-context read fails (treat
  as unauthenticated + banner, instead of whole-app 500) — `src/hooks.server.ts:116`.
- **P2** A root-_layout_ crash still uses SvelteKit's stock `errorTemplate` (a root
  `+error.svelte` only covers child-route/load errors). Consider a
  `kit.files.errorTemplate` override to brand that last-resort page too.
- **P2** Converge the toast-vs-banner failure convention (ties into the
  `useAsyncAction()`/`<StatusMessage>` extraction from the 2026-07-02 audit).
- **P3** `Sentry.captureException` on `admin.ts` silent-default branches
  (`src/lib/server/admin.ts:37-41,52-57`).
- **P3** Bounded `AbortSignal.timeout` on Odds/ESPN fetches (`src/lib/server/odds.ts:76,96`,
  ESPN fetch in `grading.ts`).
- **P3** Document one error-contract convention across read and mutation API routes.
- **P3** Distinct capture/alert for AI-gateway credential failure.
- **P3** Sweep `console.error`-only catch blocks and add Sentry captures.
- **P3** `auth/error/+page.svelte` ignores its `?reason=` query param — surface the
  specific auth failure instead of a static help card.
