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

## v3.9.0 — 2026-07-21

- **PR #736** Release v3.9.0.
- **#711** (PR #733, PR #721) ADR-0037 accepted — participation boundary: a member is
  graded only for games that kick off at or after
  `greatest(groups.competition_starts_at, joined_at)`. Decision only; implementation
  follows in #722 (grading), #724 (read surfaces), #725 (creation UI).
- **#716** Add `prod-backfill` skill — a written runbook (announce → go-ahead →
  baseline → execute → verify → record) for one-off production data writes;
  `season-ops` and `db-deep-scan` now cross-link to it.
- **PR #729** `issue-author` now writes an `Execution (model / effort)`
  recommendation into every issue it creates, and `start-issue` reads it instead of
  guessing cold; `docs/WORKFLOW.md`'s Ready-issue checklist requires it too.
- **#727** Hoist the reigning champion into an evergreen banner above the `/league`
  tabs — it used to render only at the bottom of Standings and was absent from Week
  entirely.
- **#717** `ROADMAP.md` no longer tracks release status — the stale release table and
  Now/Next/Planned sections are retired; GitHub Milestones are now the sole
  version→scope source of truth. One-time hygiene: closed 12 fully-shipped milestones
  (v2.9–v2.13, v3.2–v3.8) that were never closed.
- **#704** Ember accent for the apex Hotshot credibility tier — `RatingTierPill`,
  `RatingBand`, and `RatingLadder` swap the Hotshot fill for `--ember`; presentation
  only, no rating math or tier thresholds changed.
- **#718** Issue authoring now places new issues on the Project board at
  `Status: Backlog`, so nothing Ready is ever missing from the board; field triage
  stays human.
- **PR #719** Skills tune-up sweep — refresh `design-study` for the two-theme era, add
  the new `design-review` skill, and patch five smaller gaps across `start-issue`,
  `test-gate`, `finish-pr`, `issue-author`, and `new-adr`.
- **#710** Migration generator improvements — `--retire=<key>` delete/rename path,
  duplicate-numeric-prefix guard, `-- @phase:` override, `--amend`, and required
  migration names with signature-extraction warnings. Tooling/tests/docs only.

## v3.8.0 — 2026-07-16

- **PR #715** Release v3.8.0.
- **#689** Emoji reactions on comments — reactions now attach to a specific comment (iMessage-style tapbacks) instead of a game, making comments the social surface so we can see whether the group actually uses them. Per-comment reaction chips render only for emojis someone used; a compact picker adds one, and tapping a chip reveals who reacted. Repoints the `reactions` table onto `comments` (clean cutover, no backfill) with a comment-scoped read gate and cascade-on-delete; retires the orphaned game-reaction endpoint and query left by #688.
- **#698** Onboarding copy drift-guard — a unit test ties `HowToPlay.svelte` to the real credibility-tier catalog (`src/lib/domain/rating.ts`) plus the All-In/sweat-board/Weekly Hardware and "League" (not "Group") vocabulary, so the copy can't silently rot the way #633 found it.
- **PR #708** `badgeFlavor.test.ts`'s cross-group isolation and grade-cron suites assumed the shared two-group fixture's all-losing group (group B) always earns at least one badge — true until the badge catalog trim (#634-#655) removed every badge that used to fire for an all-losing 2-person room. The fixture now adds a member who never picks, scoped to this file only, so group B earns The Grinder and the isolation assertions have something real to check against.
- **PR #709** `CI - Integration (with-auth)` filtered on paths at the workflow-trigger
  level, so it never ran at all (no status posted) for PRs outside `supabase/**` ·
  `src/**` · `tests/integration/**` — making its `integration` job unusable as a
  required status check (a PR that doesn't touch those paths would sit "Expected"
  forever). Now triggers on every PR and gates the job internally via
  `dorny/paths-filter`, adding an `integration-result` wrapper job that always
  reports — mirroring `unit-result` / `build-result` / `pgTap-result` /
  `dry-run-result`. Also backfills four changelog gaps the governance-freshness gate
  had flagged (#693, PR #706, PR #700, PR #691). files:
  `.github/workflows/ci-integration.yml`
- **#693** Trim line-movement alerts — dropped the per-user points-threshold knob from
  `/settings`; the alert now fires on a single fixed move so the room keeps the signal
  without a bettor's configuration surface. files: `src/lib/domain/notifications.ts` ·
  `src/lib/server/notifications.ts` · `src/routes/(app)/settings/+page.svelte`
- **#694** The `/demo` CI drift-guard now checks editorial freshness, not just shape —
  it fails when the snapshot's completed season falls more than 2 years behind the
  live season, or when the snapshot is older than 180 days, closing the coverage gap
  ADR-0026 §6 / #669 flagged behind #607. files:
  `src/lib/server/demo/__tests__/demo-snapshot.test.ts`
- **PR #706** `scope-issue`'s gray-area step now routes value/on-brand judgment calls
  (e.g. "is this sub-piece even worth building?") to `pressure-test` against
  `docs/PRODUCT.md` instead of asking Doug to decide by feel; the verdict folds into
  the essential/nice-to-have table rather than becoming its own interview question.
  files: `.claude/skills/scope-issue` · `.claude/skills/pressure-test`
- **#697** Config-gate the header Beta tag — a build-time flag (`SHOW_BETA_TAG`,
  defaulting to shown) now controls the feedback-sheet Beta tag instead of it being
  implicitly tied to sign-in state, so it can flip off in one change at the public
  epoch. ADR-0028 follow-up. files: `vite.config.ts` · `src/app.d.ts` ·
  `src/lib/components/app-header/AppHeader.svelte` · `.env.example`
- **#688** Retire the game-level emoji reaction bar — removes the standalone 👍👎🔥😬🎯
  reaction row above the comment thread on kicked-off games, clearing the way for the
  comment-reactions sibling to make commenting the place people react. UI-only removal;
  the `reactions` table/API retire alongside that sibling's migration. files:
  `src/lib/components/picks/CommentsSection.svelte` ·
  `src/lib/components/picks/LockedPicksSection.svelte` ·
  `src/routes/(app)/picks/+page.server.ts`
- **PR #700** Product audit (2026-07): graded shipped features against
  `docs/PRODUCT.md`'s seven lenses — 11 Keep / 1 Reshape (`/market`). Findings filed as
  issues #692-#698; a v3.9 milestone was created for the follow-up work. files:
  `docs/audits/2026-07-16-product-audit.md`
- **#695** Displacement tenet added to `docs/PRODUCT.md` — on already-dense surfaces, additions must name what they replace (they displace, they don't stack), per the 2026-07 product audit's density finding; the `pressure-test` skill now runs the corollary explicitly.
- **PR #686** Rework the grade cron's schedule to settle TNF, MNF, and late-season
  Saturday finals within about an hour of the game ending instead of waiting for Sunday,
  and split the weekly results-recap / AI-recap-ready pushes into a new `weekly-recap`
  cron (Tue ~9am ET) so they land at a normal hour instead of ~4am. files:
  `.github/workflows/cron-grade.yml` · `.github/workflows/cron-weekly-recap.yml` ·
  `src/routes/(app)/api/cron/weekly-recap/` · `src/lib/server/cronHealth.ts`
- **PR #691** `scope-issue` and `start-issue` get advisory banners recommending
  Opus/high thinking effort for judgment-heavy scoping and non-trivial implementation
  work; `issue-author` gets a pointer to the `scope-issue` note. Docs-only — a skill
  can't switch the running session's model. files: `.claude/skills/scope-issue` ·
  `.claude/skills/start-issue` · `.claude/skills/issue-author`
- **#683** Put the recap's opening line in the "recap ready" push — the weekly AI-recap
  notification now teases the recap's actual first sentence instead of a generic "it
  dropped", so it pulls members in and gives the group chat something worth screenshotting.
  The weekly voice is also nudged to open with a self-contained hook. files:
  `src/lib/server/notifications.ts` · `src/lib/server/recap/voice.ts`
- **PR #685** Add a product-judgment layer — the twin of the design layer. A canonical
  product-principles rubric (`docs/PRODUCT.md`) crystallises the app's "heart" into seven
  grounded lenses (five judgment lenses + two escalation gates), and two skills operationalise
  it: `pressure-test` (steelman one idea → Build/Reshape/Drop → hand off) and `product-audit`
  (grade shipped surfaces into a keep/reshape/retire report). files: `docs/PRODUCT.md` ·
  `.claude/skills/pressure-test/` · `.claude/skills/product-audit/` · `CLAUDE.md` · ADR-0036

## v3.7.0 — 2026-07-14

- **PR #664** Release v3.7.0.
- **#548** Rebuild RecapFlash/WrappedFlash on the vendored Dialog/Sheet — replaces the two
  hand-rolled overlays with real modal semantics (focus trap, Escape, no suppressed a11y
  warnings) and fixes the vendored dialog's edge-to-edge width at 390px. Wrapped's seen-once
  state moves server-side (mirroring RecapFlash's `#302` marker), which also fixes `/wrapped`
  double-rendering itself under the old localStorage flash. adr: ADR-0030 · tables:
  `wrapped_seen` · routes: `/api/wrapped/mark-seen` · files: `RecapFlash.svelte` ·
  `WrappedFlash.svelte` · `dialog-content.svelte`
- **#647** Cut four season badges that measured something other than their label — The
  Homer (a trait the format can't express), The Nemesis (cover rate in disguise), Big Game
  Hunter (conviction volume, not conviction that paid) and Hot Hand (luck). The catalog
  drops 19 → 15. files: `src/lib/domain/badges.ts` · `src/lib/types/honors.ts` ·
  ADR-0035 (amended: badges must be able to say "nobody"; where does your zero come from;
  one measure, one surface)
- **#648** The verdict badges get the bar they shipped without, so each can honestly
  resolve to nobody — The Whale now requires a _winning_ All-In record, The Choker becomes
  a shutout milestone, The Oracle and The Lemming get rate bars, and The Lemming gets a
  guard scaled off its own denominator. The Lemming no longer crowns a player with a
  winning record. files: `src/lib/domain/badges.ts` · ADR-0035 §2
- **#649** Both lean axes take a league-mean zero, measured against the room that season
  rather than an invented absolute — Lone Wolf / The Sheep come out of the dark on fade
  rate, and Dog Lover stops firing every single season. files: `src/lib/domain/badges.ts` ·
  `src/lib/components/group/LeagueHonors.svelte` · ADR-0035 §4
- **#651** The Grinder becomes an attendance milestone ("missed nothing all season",
  gated to seasons that recorded attendance) and tied weeks credit nobody, so the alphabet
  no longer decides either. files: `src/lib/domain/badges.ts` ·
  `src/lib/server/recap/badgeFlavorFacts.ts` · ADR-0035 §4
- **#650** Root-caused a 2025 game with 5 `pick_settlement` rows instead of 6: the
  pre-#447 missed-penalty pass excluded the app admin via a `users.role='player'` filter,
  so the one 2025 game the admin skipped got no `missed` row. Adds a mechanism-agnostic
  completeness guard — `supabase/tests/055_pick_settlement_completeness.sql` — asserting
  every already-graded scoring game has one settlement row per active member, excluding
  `grading_locked` seasons.
- **PR #653** Week tab selector simplified to a plain dropdown — removes the prev/next
  chevron buttons from `WeekNavigator`, leaving the week-jump dropdown as the single
  control. files: `WeekNavigator.svelte`
- **PR #656** `users.role` knowledge-pack warning — documents that `role` is
  app-access, not league participation, after two independent prod defects (#430 chain,
  #650/#654) filtered a grading/scoring query on it instead of `group_memberships`.
  files: `docs/agent-context/database.md` · `docs/agent-context/auth.md`
- **PR #662** Invites card cleanup — the invite row now stacks on mobile instead of the
  code overlapping the action buttons, Share is the primary action (Copy demoted to
  secondary), and `mint_invite` reuses an existing unlimited/no-expiry invite instead of
  minting a new row every click, so the Active invites list no longer piles up with
  duplicates. files: `league/manage/+page.svelte` · `mint_invite.sql`
- **PR #663** Add a `db-deep-scan` skill for deep, read-only pre-release database
  audits — grading-correctness recomputation, per-policy RLS review, per-function
  SECURITY DEFINER audit, full referential sweep, DB-size/backup/auth posture.
  Complements `season-ops`. files: `.claude/skills/db-deep-scan/SKILL.md`
- **#625** Add a `concurrency:` guard to the `grade` cron so overlapping runs queue
  instead of racing — defense in depth alongside the refresh-once race fix in #622.
  files: `.github/workflows/cron-grade.yml`
- **#669** Bring `/demo` to parity with the shipped app — same four tabs (Picks · League ·
  Stats · Market), the credibility rating, and weekly hardware, instead of the superseded
  Picks/League/Wrapped/Recap mirror. Extracted a shared `StandingsTable` and a `readonly` mode
  on the real `PicksBoard` so the demo and the authed app render identical components instead of
  hand-mirrors; extended the snapshot with `weeklyAwards`/`stats`/`market`; hardened the CI
  drift-guard to catch badge-catalog staleness. Amends ADR-0026 with the IA-mirror rule. files:
  `src/lib/components/leaderboard/StandingsTable.svelte` · `src/routes/demo/`
- **#619** Harden the credibility-rating rebuild — the upsert-and-prune that rebuilds
  `player_ratings` now runs as one atomic RPC serialized by a transaction-scoped advisory
  lock, closing the last concurrent-rebuild gap #622 only mitigated. The rebuild is also
  wired into every settlement-writing path that isn't a live grade (demo seed, prod-clone,
  historical import), and the one-shot `pnpm ratings:rebuild` entrypoint is simplified and
  proven end-to-end. files: `supabase/src/functions/_private/rebuild_player_ratings.sql` ·
  `src/lib/server/rating/rebuild.ts` · `scripts/rebuildRatings.ts` ·
  `supabase/scripts/{cloneDb,seed-demo/index}.ts` · ADR-0032 / ADR-0013
- **#657** Fix grading preset freeze to be per-game-cohort, not per-row — a settlement
  row born into an already-graded game (a new active member, or a backfilled gap) now
  adopts the preset its game's existing rows were already frozen under, instead of
  falling through to the group's current config. ADR-0007 (2026-07-15 amendment).
  files: `supabase/src/functions/_private/grade_games_by_ids.sql`
- **#633** Refreshed the "How to Play" onboarding guide to match the shipped app —
  "Group" replaced with "League" throughout, the two-tab League (Standings · Week),
  Weekly Hardware / season shelf, the credibility rating and its tiers, the live
  sweat board, and a `Market` bullet covering all four nav destinations. files:
  `src/lib/components/howto/HowToPlay.svelte`
- **#666** Fixed stray "Group" copy still shown to users instead of "League" — the join
  flow, league manage screen, and admin surfaces now consistently say "League" to match
  the renamed routes and nav (see the League vs Market naming decision). Copy/aria-label
  only, no route or identifier renames. files: `GroupSwitcher.svelte` · `routes/join/**` ·
  `routes/(app)/league/manage/+page.svelte` · `AddMemberCard.svelte` ·
  `routes/(app)/admin/feedback/+page.svelte`
- **#674** Restore the PWA install/notification banner to in-flow rendering — split
  the install decision (synchronous) from the notification decision (awaits push
  subscription state) so the banner no longer needs to float as a fixed overlay to
  avoid layout shift. files: `src/lib/pwa/engagement.ts` ·
  `src/lib/components/pwa/EngagementBanner.svelte`
- **#660** Re-organize `/league/manage` by audience — it becomes a commissioner-only
  console (one flat scroll, no tab bar) and the personal knobs (AI recap opt-out, Leave
  league) move to `/settings`, beside the other per-user preferences. The Members/Manage
  tabs split the page by audience rather than topic, so members were sent to a page that
  had nothing for them. A `Commissioner` marker on the `/league` standings row now tells
  everyone who runs the league. routes: `/league`, `/league/manage`, `/settings` ·
  ADR-0017 / ADR-0030
- **#658** Fix `rollover-week`'s completeness check, which compared
  `pick_settlement` row counts to raw pick counts and could never pass once
  anyone missed a pick (confirmed failing every run on prod since
  2026-06-23). Now mirrors `find_unsettled_weeks`' predicate: complete once
  every final game has been graded. files:
  `supabase/src/functions/grade/advance_week_if_complete.sql`

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
