# Changelog — shipped work

A terse, newest-first log of what has shipped to `master`, one entry per merged
issue/PR. It exists so an agent can answer **"is X already done?"** by reading this
file instead of reverse-engineering completion from source code.

**GitHub stays authoritative.** This is convenience _shipped history_ (the same
category as GitHub Releases), not live status. Closed Issues, merged PRs, the GitHub
Project `Done` column, and Releases remain the sources of truth — see
`docs/WORKFLOW.md`. For anything newer than the latest entry here, check `gh`.

## How entries are added

- The entry is added **inside the feature's own PR** (a step in the `finish-pr` skill)
  as a fragment file under [`docs/changelog.d/`](changelog.d/) — **not** by editing this
  file. It merges atomically with the code, so the entry exists in `master` if and only
  if the work does — it cannot drift.
- **One fragment per PR, uniquely named** `docs/changelog.d/<branch-slug>.md`. Because no
  two PRs ever touch the same path, concurrent same-day PRs never collide — the pain that
  editing the shared top of this file used to cause (GitHub ignores the `merge=union`
  driver in `.gitattributes` that resolves it locally). `cut-release` assembles the
  fragments into this file at release time; see
  [`docs/changelog.d/README.md`](changelog.d/README.md).
- **This file holds released windows; fragments hold the unreleased window.** Everything
  from the last release backward lives here under `## v<version>` (and, for anything not
  yet squashed, `## YYYY-MM-DD`) headings, newest first. Unreleased entries live in
  `docs/changelog.d/` until the next release cut — so answering "is X done?" reads both.
- **Keep each entry short — a pointer, not a spec.** Include the issue/PR number, a
  short title, one or two sentences on _what_ changed and _why it matters_, the
  notable tables/views/routes/files touched (as bare pointers), and the governing
  ADR(s). The PR description, the code, and the ADR hold the detail — link to them,
  don't restate them. A fragment holds the bullet only (no date heading); example of the
  richest form an entry should reach:

  ```
  - **#142** Drop-worst-week scoring — season scoring drops each player's lowest
    week. tables: group_rules · view: season_leaderboard · ADR-0006
  ```

- **Do not include the implementation narrative.** Leave out function/variable names
  and signatures, config values (TTLs, thresholds), enumerated test files, error
  codes, and step-by-step prod/runbook recaps. They duplicate authoritative sources
  that change without this file — a changelog that names a TTL or an internal symbol
  starts lying the moment either is changed. Name the file as a pointer (`auth.ts`),
  not the symbols inside it.

- **Every merged PR gets an entry — including issue-less ones.** Chores, skills,
  CI/infra, and docs PRs that close no issue are still logged, keyed by PR number and
  written `**PR #NNN**` to distinguish them from issue numbers (`**#NNN**`). This keeps
  the log a complete answer to "is X already done?" rather than a features-only subset.
- **Fragments make the old shared-file conflict moot.** The unique filename means two
  in-flight PRs never touch the same path, so there is nothing to resolve. The
  `docs/CHANGELOG.md merge=union` line in `.gitattributes` is kept only as a fallback for
  the rare direct edit of this file (a release squash), consistent with the
  serialize-shared-files rule in `docs/WORKFLOW.md`.

> History before the first entry below lives in **GitHub Releases (v1.2–v3.3)**; this
> log is not backfilled past that.

## Release squashing

At release-cut time the `cut-release` skill **assembles** the unreleased fragments in
`docs/changelog.d/` (plus any leftover date-headed entries still in this file from before
the fragments migration) into a single `## v<version> — YYYY-MM-DD` heading, condensing
each to one line while keeping every `#NNN` / `PR #NNN` reference intact (the
governance-freshness gate greps for them), then deletes the assembled fragment files.
This only happens at release-cut time and only for that release's window — entries from
prior releases are never touched, and `finish-pr` still adds one fragment per PR the rest
of the time.

## v3.6.0 — 2026-07-14

- **PR #645** Release v3.6.0.
- **#634** Trim the season badge catalog — cut 📈 The Sharp and 🤡 The Fool (both
  duplicated or contradicted the ADR-0032 credibility rating), Week Winner now requires
  sole possession. ADR-0035 ("the credibility rating owns the market, badges own the
  room"). files: `src/lib/domain/badges.ts` · `src/lib/types/honors.ts`
- **#635** Badge axis layer — a paired badge declares one measure, two ends, an honest
  zero, and a bar; each end awards independently, so an axis yields 0, 1, or 2 titles
  instead of always crowning both ends of a sorted list. Line lean now shares its
  zero/threshold with `/stats`' `lineSideTendency`; crowd lean stays dark with its zero
  unset. ADR-0035. files: `src/lib/domain/badges.ts` · `src/lib/components/group/LeagueHonors.svelte`
- **#636** Backdoor of the Week — mirror of Bad Beat, crowning the win that barely
  covered instead of the loss that almost did, derived from the same weekly-hardware
  matview. files: `src/lib/domain/weeklyAwards.ts` · `src/lib/components/recap/WeeklyHardware.svelte`
- **#637** /league credibility ladder — the All-time Standings scope now shows every
  member's career rating and tier, putting the room and the market on one screen.
  ADR-0032. routes: `/league` · files: `src/lib/components/leaderboard/RatingLadder.svelte`
- **#638** Season dropdowns default to career/all-time in the off-season —
  `/league`, `/stats`, and `/market` no longer preselect a finished season; in-progress
  is read from the season's scoring weeks. files: `src/lib/server/db/queries/seasonProgress.ts`

## v3.5.0 — 2026-07-14

- **PR #639** Release v3.5.0.
- **#631** League home's two tabs are now fully self-contained — honors and the Members & manage card are scoped to their own panel, Standings keeps the season/All-time select, Week gets a new `WeekNavigator` and leads with that week's hardware plus a link into `/recap`; the weekly "Sharp of the Week" award is renamed Game Ball of the Week. files: league/+page.svelte · LeagueHonors.svelte · WeeklyHardware.svelte · WeekNavigator.svelte · recap/+page.svelte
- **PR #629** Fix the black-box brand mark behind the sign-in logo and header — the in-app Hotshot lockup/mark SVGs are now transparent with a theme-aware chip, navbar mark right-sized. files: `static/hotshot-lockup.svg` · `static/logo-mark.svg` · `src/app.css`
- **#628** iOS PWA launch (splash) screen — home-screen installs show a charcoal launch image with the centered HOTSHOT lockup instead of a blank flash. files: `scripts/generate-brand-assets.mjs` · `src/app.html` · ADR-0034
- **#622** Grade cron runs the global post-grade refreshes once — leaderboard/stats matview refresh and the credibility-ratings rebuild are hoisted into a single `refreshReadModels()` call, fixing a transient empty `player_ratings` and a doubled matview refresh. files: grading.ts · rating/rebuild.ts · ADR-0013 / ADR-0032
- **#621** Simplify the Hotshot logo into a pointed football, cream laces, and a restrained rising line; regenerate the complete browser/auth/Apple/PWA/push asset family from deterministic vector geometry. files: `static/` · `scripts/generate-brand-assets.mjs` · ADR-0034
- **PR #620** Rename the apex credibility-rating tier Shark → Hotshot, one pill louder than Sharp on the `/stats` Career band. ADR-0032 (amendment §5)
- **#361** Credibility rating v2 (PR #618) — the cross-season "who knows ball" rating is now an order-independent, conviction-flat career cover-rate graded against the pick-time line, replacing the sequential conviction-weighted ELO. files: `computeRatings.ts` · `rating.ts` · ADR-0032 (amended)
- **PR #617** De-flake the admin authz integration suite — the `/api/admin/sync-schedule` auth test mocks `scheduleSync` instead of running live ESPN fetches that intermittently tripped the CI timeout. Test-only.
- **PR #615** Confirm your name in the welcome guide — a prefilled "Your name" field lets email signups pick a friendly display name once. component: `WelcomeGuide`
- **#602** Client-query data loading (ADR-0033), first slice (PR #616) — adds the load-classification inventory and migrates `/recap` to a cached `createQuery`-backed `/api/recap` endpoint; Wrapped/Picks remain follow-ups.
- **PR #613** Native share for invite links — the commissioner Invites panel offers a mobile OS share sheet with clipboard-copy fallback. route: `/league/manage`
- **PR #614** PWA mobile polish — iOS standalone metas for a full-screen launch, manifest gains a stable `id` plus app shortcuts. files: `src/app.html` · `vite.config.ts`
- **PR #612** Invite-only onboarding screen — the groupless `/join` page now redeems a pasted invite link/code or offers a demo escape hatch. route: `/join`
- **PR #611** Streamline the sign-up entry path — "Continue with Google" renders in sign-up mode too, and post-auth `next` survives email confirmation for invitees. routes: `/auth`, `/auth/confirm`
- **PR #610** Fix the no-group redirect — six routes that bounced groupless users to `/auth/error` now send them to `/join`.
- **#604** Prove the Supabase backup is restorable (restore drill) — restored the latest off-platform prod dump into a scratch DB and reconciled row counts against prod with zero drift. files: `docs/runbooks/backup-restore-drill.md` · ADR-0010
- **#387** Weekly hardware + season shelf — every fully-graded week mints four deterministic awards (Sharp / Donkey / Bad Beat / Contrarian Win of the Week) shown on the recap and a per-season trophy shelf. view: `group_pick_cover` · `lib/domain/weeklyAwards.ts` · ADR-0013 / ADR-0016
- **PR #603** Mark ADR-0033 (client-query data loading) Accepted — ratifies the client-side query/cache data-loading pattern as the standard for read surfaces.

## v3.4.0 — 2026-07-13

- **PR #601** Release v3.4.0.
- **#585** Demo live sweat board — bakes a frozen mid-game week into `/demo` so the picks sweat and Weekly-tab provisional standings render on demand. ADR-0026.
- **#584** Live sweat board on the `/league` Weekly tab — ranked live week-so-far board + per-game cover verdicts, `/league` opens on Weekly during a live window.
- **#588** Verify the session JWT locally on the auth hot path — cryptographic JWKS check replaces the per-request auth-server round-trip. ADR-0031.
- **PR #596** Mark ADR-0032 (cross-season credibility rating) Accepted, clearing the gate on #361's implementation.
- **#542** Render the picks partial-apply saveError as a durable, screen-reader-announced note. `FormNote`.
- **PR #594** Add ADR-0033 (client-query data loading) — decision to classify page loads as client TanStack Query vs. server-only, generalizing ADR-0017 app-wide; implementation tracked in #381.
- **PR #593** Mark ADR-0031 (local JWT verification) Accepted, clearing the gate on #588.
- **PR #592** Speed up the `/picks` page load — drop a redundant display-name query, dedupe the active-week resolve, overlap the comments/reactions fetch.
- **#541** Focus-ring standardization + avatar-picker `radiogroup`/roving-tabindex semantics (audit S3). ADR-0029.
- **#386** Live Sunday sweat board — in-game scores + per-pick cover state + week-so-far projection on `/picks`, display-only, no cron/DB change.
- **PR #589** Add ADR-0031 (local JWT verification on the auth hot path) — decision doc; implementation tracked in #588.
- **#586** Changelog entries move to per-PR fragments under `docs/changelog.d/`; `cut-release` assembles them at release time.
- **PR #583** Reorder `/league` Standings — table leads over the race chart, W-L-P record moves under the name to stop Total-column clipping at 390px. ADR-0030.
- **PR #582** Adopt shared `ChipRadiogroup` for the `/market` "Slice by" chips (closes the last hand-rolled radiogroup, audit S7).
- **PR #581** Make the `/league` season dropdown sticky, matching `/stats`/`/market`.
- **PR #571** Squash `docs/CHANGELOG.md` history through v3.3 (already covered by tagged Releases); also flips ADR-0029 to Accepted.
- **PR #579** Rename the NFL-market tab "Teams" → "Market", reserve "League" for the user's group (308 redirect). ADR-0030.
- **PR #577** Fix frozen chart tooltip on touch-scroll (`pointercancel` vs `pointerleave`) on `/stats` and `/league`.
- **#567** Consolidate the `/stats` top into one scope-aware hero (`StatsHero` + `SignatureTells`), retiring `YourEdge`/`CareerSummary`. ADR-0018/0030.
- **PR #578** Fix `/stats` win-loss-push text invisible on the light theme (hardcoded dark-only color).
- **PR #576** Remove the `/league` "Quadrants" chip from the Slice-by row (low-value slice; underlying data untouched).
- **#532** Light theme — real "Parchment" palette + per-user dark/light/system toggle (`users.theme_pref`, SSR no-flash). ADR-0029.
- **PR #574** Hermetic AI-gateway integration tests — recap/wrapped/badge fallback suites force no-gateway instead of inheriting `.env.local`. ADR-0008.
- **PR #572** Agent-instructions skills sweep — map the `.claude/skills/` delivery pipeline into `CLAUDE.md`/`AGENTS.md`.
- **#540** Global `prefers-reduced-motion` fallback (audit S2) in `app.css`. ADR-0029/0030.
- **PR #570** `cut-release` backfills governance drift + squashes the changelog window at cut time.
- **PR #580** Backfill PR #571's missing changelog entry.
