# Changelog — shipped work

A terse, newest-first log of what has shipped to `master`, one entry per merged
issue/PR. It exists so an agent can answer **"is X already done?"** by reading this
file instead of reverse-engineering completion from source code.

**GitHub stays authoritative.** This is convenience _shipped history_ (the same
category as GitHub Releases), not live status. Closed Issues, merged PRs, the GitHub
Project `Done` column, and Releases remain the sources of truth — see
`docs/WORKFLOW.md`. For anything newer than the latest entry here, check `gh`.

## How entries are added

- The entry is added **inside the feature's own PR** (a step in the `finish-pr`
  skill), so it merges atomically with the code. The entry exists in `master` if and
  only if the work does — it cannot drift.
- **Newest first.** Group entries under a `## YYYY-MM-DD` date heading (the PR-open
  date is fine).
- **Keep each entry short — a pointer, not a spec.** Include the issue/PR number, a
  short title, one or two sentences on _what_ changed and _why it matters_, the
  notable tables/views/routes/files touched (as bare pointers), and the governing
  ADR(s). The PR description, the code, and the ADR hold the detail — link to them,
  don't restate them. Example of the richest form an entry should reach:

  ```
  ## 2026-07-12
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
- This is a shared file: top-of-file edits from two in-flight PRs can conflict.
  Resolve by **keeping both entries** (never take one side wholesale), consistent
  with the serialize-shared-files rule in `docs/WORKFLOW.md`.

> History before the first entry below lives in **GitHub Releases (v1.2–v1.7)** and
> the `ROADMAP.md` "Shipped" section; this log is not backfilled past that.

## 2026-07-11

- **PR #536** Mobile-first design principles — a living `docs/DESIGN.md` (16 interaction
  principles + a prescriptive chip-radiogroup pattern spec + a hard-constraints checklist,
  now a UI gate in the PR template) and **ADR-0030** ratifying it. The interaction layer
  that composes the ADR-0029 token vocabulary into mobile screens; first application will be
  the /stats breakdown block (nested accordion → chips). docs: `docs/DESIGN.md` ·
  `AGENTS.md` · `docs/agent-context/{ui,design-system}.md` · ADR-0030
- **#529** /league — merged the Teams and Trends tabs into one surface: a single season dropdown
  (each season plus a pooled "Last 5" window) and a "Slice by" chip row pick the view, and "Where
  the market bends" now leads the page for everyone instead of hiding inside a tab. Removes the two
  out-of-sync season pickers and the chip strip that clipped off-screen at 390px; no data-model
  change. route: `/league` · util: `leagueSlices.ts`
- **#514** /stats situational explorer — the "Your edge" hero (career) now leads above the scope
  line, and a new "Every split" explorer beneath it browses every ATS cut (primetime, home/away,
  spread bucket, divisional) one dimension at a time as bars diverging from the league line, across
  Career **or any season**. The season lens adds season-grained situational views; the edge stays
  career + sample-gated by design, and the legacy team/weight/trend/H2H tables fold into one "More
  breakdowns" disclosure. views: `stats_situational_splits_season` · `league_situational_baseline_season`
  · component: `SituationalExplorer.svelte` · route: `/stats` · ADR-0013/0017
- **#530** Design-system foundations — one token vocabulary layered on Tailwind: semantic
  typography / spacing / elevation / motion tokens join the existing color/radius tokens in
  `@theme inline`, with theme-responsive (light+dark) elevation so a light theme can flip. The
  brand-color guard now also fails raw inline hex (issue-ref-safe: comment-stripped + length/
  value-context rule), with an allowlist for dynamic sources. New `design-system.md` context
  pack codifies the catalog, selection-tier ladder, and elevation layering. files: `app.css` ·
  `scripts/check-brand-colors.ts` · `docs/agent-context/design-system.md` · ADR-0029
- **PR #528** Leaderboard Total column no longer clips on mobile — the player-name column now
  truncates so a long display name can't push the standings table past a 390px viewport, keeping
  the Total column (season, all-time, and the `/demo` table) on-screen. Presentation-only. routes:
  `/leaderboard` · `/demo` · component: `DemoStandingsTable.svelte`
- **#518** /stats consolidate controls + mobile density pass — the player selector and the
  season/scope selector fold into one sticky context bar, and the season dropdown now absorbs
  Career as a pinned option (the separate Season/Career tab is gone), so scope is a single
  control that scales as seasons accumulate. The page leads with synthesis — the #502 "Your
  edge" hero plus a compact snapshot — and demotes the by-team / by-weight / trend /
  head-to-head tables behind a collapsible Breakdown; accuracy now renders as the shared
  cover% meter with a 50% baseline so nothing clips at 390px. Presentation-only over the
  existing stats views. component: `StatAccuracyList.svelte` · shared: `CoverMeter.svelte` ·
  route: `/stats` · ADR-0013/0017
- **#525** /league Trends cut consolidation — drops the redundant standalone Home/away chip
  (its cover rate was fully contained in Quadrants, the home/away × favorite/underdog joint)
  and folds the two side marginals in as summary lines above the four cells. The Quadrants
  card becomes "Home & away favorites"; the Trends tab now shows five chips instead of six.
  Presentation-only — the `homeAway` payload and `league_ats_home_away` view are unchanged.
  component: `Quadrants.svelte` · route: `/league` · follows #517

- **#517** /league Trends redesign — the Trends tab now leads with a "Where the market bends"
  synthesis chart (favorite cover rate vs a 50% coin-flip baseline, gold = favorites / sky =
  dogs) and moves the six situational cuts behind a one-cut-at-a-time chip selector rendering a
  single detail panel, instead of six always-open cards. Cover% reads as a shared meter with a
  50% tick that no longer clips at 390px. Presentation-only over the shipped `league_ats_*`
  views — payload unchanged. components: `MarketBends.svelte` · `CoverMeter.svelte` · util:
  `leagueBends.ts` · route: `/league` · ADR-0013/0002/0017

- **PR #523** land-pr checks CI once, never polls (chore, skills) — the `land-pr` skill now
  reads a PR's checks a single time and hands back to Doug if any are still running, instead of
  waiting/polling: CI is not harness-tracked work, so there is no completion event to await.
  file: `.claude/skills/land-pr/SKILL.md`

- **#502** "Your edge" analytics (PR 2 of 2) — closes the epic: `/stats` now leads with a
  "Your edge" panel calling out where the selected player most beats or trails the market against
  the spread, career-first and sample-guarded. Joins the per-user situational cuts from PR 1 to a
  new league-wide market baseline computed at the same backed-side grain. view:
  `league_situational_baseline` · component: `YourEdge.svelte` · route: `/stats` · ADR-0013/0017

- **PR #521** Agent-context gotchas (docs, chore) — records in the database/testing context
  packs the traps that cost rework on #502: verify a table's assembled shape (`picks` is
  group-scoped; `locked_spread_*` are `NOT NULL`) rather than its base `CREATE`; how to cleanly
  regenerate an uncommitted migration; re-run `000_setup.sql` before a single-file pgTAP run
  after `supabase db reset`; and that a fresh-worktree `pnpm dev` cold-boot is unreliable for a
  live eyeball. files: `docs/agent-context/{database,testing}.md`

## 2026-07-10

- **#502** "Your edge" analytics (PR 1 of 2) — per-user situational ATS views plus the
  previously-latent `/stats` tendency tiles. Adds career-grain situational cuts (primetime,
  home/away, spread bucket, divisional) mirroring the `league_ats_*` pattern, and surfaces
  favorite-vs-underdog, win-streak, and consensus tendencies for the selected player/season.
  The join-to-league-baseline "edge" panel that consumes these views is PR 2. views:
  `stats_situational_base`, `stats_situational_splits` · fn: `refresh_leaderboard_stats` ·
  route: `/stats` · ADR-0013/0017

- **PR #519** Design-study skill (issue-less, chore) — new `design-study` skill turns a UI
  feature idea into an opinionated before/after artifact in the app's real dark skin
  (capture current screens → diagnose → propose composable moves → mock at 390px); bundles
  the study scaffold + throwaway Playwright capture harness. Wired into issue planning:
  `issue-author` gains a UI-study gate and a `scope-issue` offer for complex work, and
  `scope-issue`/`start-issue` cross-reference it. files: `.claude/skills/design-study/**`

- **#500** In-app feedback — admin triage queue + GitHub filing (2 of 2 PRs, closes
  #500): a global-admin `/admin/feedback` inbox lists stored reports newest-first
  (status-filterable) and files the worth-fixing ones as sanitized public issues via a
  fine-grained PAT — human-in-the-loop, always `source:feedback`-labelled. Public-repo
  privacy split: only route/build/viewport/UA cross into the issue while the user id and
  Sentry id stay in the DB, and a missing/expired token degrades to a prefilled new-issue
  URL rather than hard-failing. route: `admin/feedback` · `lib/server/feedback/github.ts`
  · env: `GITHUB_FEEDBACK_TOKEN` · ADR-0028

- **PR #516** Migrate SeasonTrendChart to layerchart 2 (issue-less, fix) — #513 merged
  `layerchart` 2.0.1 (the major #511 held back), whose `LineChart` moved from slots to
  snippets, so the ADR-0018 dropped-week ring overlay stopped type-checking and left
  `pnpm check`/CI `lint` red on master. Port the `aboveMarks` slot to the v2 snippet API
  (scales read off the snippet `context`); the ring overlay renders unchanged. file:
  `stats/SeasonTrendChart.svelte` · ADR-0018

- **#500** In-app feedback — capture path (PR #512, 1 of 2): a floating widget + a header
  "Beta" tag let players report a bug/idea/reaction from any authed route; submissions are
  store-first to a new `feedback` table (no LLM, app-agnostic endpoint) with auto-captured
  route/build/viewport/Sentry/season context. Admin triage queue + one-click GitHub filing
  follow in PR 2. table: `feedback` · route: `api/feedback` · component:
  `FeedbackWidget.svelte` · ADR-0028

- **PR #511** Bundle the outstanding dependabot updates (issue-less, chore) — combines the
  three open dependabot PRs (#483 dev-deps, #473 prod-deps, #471 `supabase/setup-cli`
  v2→v3) into one branch. Holds back two breaking majors — `typescript` 6→7 (crashes
  svelte-check) and `layerchart` 1→2 (`LineChart` slots→snippets breaks the ADR-0018
  dropped-week overlay) — for separate migration PRs. Also backfills the changelog entries
  the governance gate was flagging. files: `package.json` · `pnpm-lock.yaml` ·
  `.github/workflows/*`

- **PR #510** Add ADR-0028 for the in-app feedback tool (issue-less, docs) — records the
  design decision for the #500 in-app feedback/bug-reporting tool ahead of implementation.
  docs: `adr/0028-in-app-feedback-tool.md`

- **PR #509** v3.0.0 release — Hotshot Calls rebrand relaunch (name, logo, theme,
  de-gamble reposition), the public shareable demo season snapshot, and the pick-lock
  micro-interaction. issues: #231 · #460 · #478 · ADR-0024

- **PR #508** /league team drill-down overflow fix (issue-less) — the expandable team
  list is now a disclosure list instead of a `<table>`, so an open team's game log
  scrolls inside its own panel rather than stretching the whole table off-screen (the
  right-hand Cover&nbsp;%/SU columns no longer clip when a row opens). Situational splits
  render as 2×2 stat tiles (cover&nbsp;% headline, W-L-P caption) instead of the old
  inline mash. route: `league/+page.svelte`
- **PR #507** Scheduled off-platform prod DB backup (issue-less, infra) — backups no
  longer fire only at release. New `cron-backup.yml` dumps prod to OneDrive weekly (flip
  to daily at season start) and prunes dumps > 90 days; Supabase Free has no managed
  backups, so these are the only backup. The pre-release snapshot and the scheduled job
  now share a composite action so they dump identically; the local `db:backup:prod`
  script's stale env-var comment is corrected. files:
  `.github/actions/backup-supabase-db/action.yml` · `cron-backup.yml` · `deploy-prod.yml`
  · `supabase/scripts/backup-db.mjs` · ADR-0010
- **PR #506** Backfill CHANGELOG entry for PR #505 (issue-less, docs) — #505 shipped the
  mobile design-review fixes but merged before its `finish-pr` changelog step landed. From
  a 390px walk-through of every screen: the Leaderboard's Total column no longer scrolls
  off-screen (on mobile W-L-P collapse into a compact record cell and Miss is dropped so
  Total stays visible), the disabled Lock in reads as present-but-inactive instead of
  vanishing, admin card headers stack instead of cramping, and muted text / bottom-tab
  labels gain contrast headroom. files: `leaderboard/+page.svelte` ·
  `DemoStandingsTable.svelte` · `app.css` · `admin/*Card.svelte` · `BottomTabBar.svelte`

- **#206** Free cron missed-run watchdog + Sentry free-tier tuning — a token-guarded
  health endpoint reports whether each scheduled cron ran on time (schedule-aware,
  from `cron_run_log`) and whether odds sync is halted at cap, so a free external
  uptime monitor catches missed runs, stale data, and site-down with no paid Sentry
  Cron Monitors. Also lowers Sentry trace/replay/log sampling to stay in the free
  tier. route: `api/health` · `cronHealth.ts` · docs: `observability/health-watchdog.md`

- **PR #501** Recap voice emoji variety (issue-less) — the Commissioner's weekly-recap
  and Season Wrapped prompt allowed "one or two emojis" with no steer on which one, so
  the model converged on 😈 almost every time. Cap it at one, name a small beat-matched
  palette, and let quiet weeks skip it entirely. file: `recap/voice.ts`

- **PR #504** Stop offseason `sync-odds` cron paging Sentry (issue-less) — the daily odds
  sync threw on `syncOddsForActiveWeek`'s expected no-op early-returns ("No active week",
  "monthly call cap reached"), turning every quiet offseason run into a 500 + Sentry alert.
  It now returns the structured result without throwing, mirroring the pregame cron. file:
  `api/cron/sync-odds/+server.ts`
- **PR #499** Label client Sentry events by `VERCEL_ENV` (issue-less) — the browser
  `Sentry.init` never set `environment`, so all client errors (local dev, preview, LAN
  worktrees) defaulted to `production` and swamped prod with mislabeled noise. Bake
  `VERCEL_ENV` into the browser build via a Vite `define`, mirroring the server. files:
  `hooks.client.ts` · `vite.config.ts`
- **PR #498** Backfill CHANGELOG entry for PR #495 (issue-less, docs) — duplicate of the
  #497 backfill; kept per the changelog's keep-both convention.
- **PR #497** Backfill CHANGELOG entry for PR #495 (issue-less, docs) — logs the System32
  PATH fix that merged before its `finish-pr` changelog step landed.
- **PR #496** Repair pick-lock silent hang, stop 500 leaks, add error page (issue-less) —
  from a repo-wide error-handling audit: `lockPick`/`unlockPick` now resolve
  `{ok:false, reason}` instead of letting `apiCall`'s throw-on-non-2xx (incl. expected
  409s) stick the button on "Locking in…" forever; the picks/comments/reactions 500s now
  `captureException` and return a generic body instead of leaking the raw Postgres message;
  and a new branded, always-dark `+error.svelte` replaces SvelteKit's bare fallback. files:
  `api/picks.ts` · `api/{picks,comments,reactions}/[gameId]/+server.ts` · `+error.svelte` ·
  docs: `audits/2026-07-09-error-handling-audit.md`
- **PR #494** Make preview deploys purely on-demand (issue-less, ci) — drop the automatic
  preview deploy on PR open/ready/reopen; `deploy-preview.yml` now fires only on a
  `/preview` comment from an authorized author. Production gating is unaffected. files:
  `.github/workflows/deploy-preview.yml` · ADR-0010
- **PR #493** Live-update the "Who's picked" board (issue-less) — the counts-only picks
  status board was a static server prop, so lock/unlock never recomputed it; the current
  user's own row now derives live from the picks store. `picks_status_board` also counts
  only still-open games (a kicked-off game drops from both numerator and denominator), and
  the board collapses to a one-line header that expands on tap. view: `picks_status_board`
  · `PicksBoard.svelte` · ADR-0019
- **PR #492** Backfill missing CHANGELOG entries (#477–#491) (issue-less, docs) — logs the
  batch of design/demo PRs that merged before their changelog step landed.

## 2026-07-09

- **PR #495** Include System32 in the Claude Code PATH override (issue-less) — the repo's
  `.claude/settings.json` PATH prepend omitted `System32`, so some Windows shell built-ins
  didn't resolve for the agent tools; add it. files: `.claude/settings.json`
- **PR #491** Scope the `/league` season picker to the Teams tab (issue-less) — the
  page-level dropdown implied it governed both tabs (the WeekSlate hero ignored it) and
  its empty state blanked the whole page, hiding Trends. Move the picker and its
  season-scoped gating into the Teams tab; pin the Trends "This season" scope to the
  most-recent-season-with-data, independent of the picker. files: `league/+page.svelte`
  · `league/+page.server.ts`
- **PR #490** Pick-card color hierarchy (issue-less) — the selected team and the Lock in
  button both lived in the ember family, so the commit CTA competed with the choice above
  it. Give each element a fixed tier: charcoal for inactive, dark ember for the selected
  team, brass for the selected weight, and the brightest ember reserved for Lock in, so the
  commit button is always the loudest thing on the card; the disabled Lock in is now flat
  and inert rather than a muddy dimmed-brass. files: `app.css` · `LockControls.svelte`
- **PR #489** "Last 4" column header in Hot & Cold (issue-less) — the recent-form
  streak column in the League Hot & Cold table had no header, leaving the run of W/L
  marks unlabelled. Give it a "Last 4" header. files: `league/HotCold.svelte`
- **PR #488** SVG chevrons for the weekly leaderboard nav (issue-less) — the week
  back/forward arrows were text glyphs that rendered inconsistently across platforms;
  swap them for inline SVG chevrons. files: `leaderboard/WeeklyPicksBreakdown.svelte`
- **PR #487** Regenerate demo recaps through the real LLM (issue-less) — the frozen
  `/demo` weekly recaps now come from the real recap pipeline at full spice instead of
  placeholder prose, and the regeneration path is repeatable. files:
  `server/demo/demo-snapshot.json` · `supabase/scripts/demo-snapshot/` · ADR-0026
- **PR #486** Enlarge the header logo mark (issue-less) — the Hotshot mark in the app
  header was too small to read clearly; size it up. files: `app-header/AppHeader.svelte`
- **PR #485** Drop redundant points from the demo pick-weight badge (issue-less) — the
  demo picks board rendered the weight label and its point value twice; remove the
  duplicate. files: `demo/DemoPicksBoard.svelte`
- **PR #481** Hotshot lockup on sign-in, mark in demo nav (issue-less) — use the Hotshot
  lockup on the sign-in/sign-up screen and add the mark to the demo nav. files:
  `auth/+page.svelte` · `demo/DemoNav.svelte` · `static/hotshot-lockup.png`
- **PR #477** Stop the committed-picks section snapping shut on the 1s tick (issue-less)
  — the live clock tick collapsed the committed-picks section each second; keep it open
  as the clock updates. files: `picks/LockedPicksSection.svelte`
- **#478** Subtle pick-lock micro-interaction — locking a pick no longer hard-cuts:
  the card animates out of the upcoming grid while the survivors reflow, and the
  committed row settles into place, with a symmetric reverse on unlock. Kept quick and
  deliberately quieter than the All-In signature moment, and a no-op under
  `prefers-reduced-motion`. files: `PicksBoard.svelte` · `LockedPicksSection.svelte` ·
  `ui/motion.ts` · ADR-0023
- **PR #482** Trim the `/demo` sign-up CTAs to one (issue-less) — the read-only demo
  stacked sign-up buttons (sticky nav CTA + persona-banner CTA on every page, plus one
  per open-game card and a bottom CTA on the picks screen). Keep only the sticky nav
  CTA; the banner is now context-only and the picks/recap CTAs are gone, so the demo
  reads as a tour rather than a sales pitch. files: `DemoBanner.svelte` ·
  `DemoPicksBoard.svelte` · `demo/recap/+page.svelte` · ADR-0026
- **#476** Palette audit — move the remaining off-brand surfaces (leaderboard weekly
  cards, League honors, avatar crown, How-to-play scoring, `/league` small-sample
  markers) onto the Hotshot brand tokens, delete the now-dead team-color helpers, and
  add a lint guard that blocks raw Tailwind color scales in `.svelte`. Follow-up to #231.
  files: `WeeklyPickCard.svelte` · `LeagueHonors.svelte` · `scripts/check-brand-colors.ts`
- **PR #479** Demo mobile nav parity (issue-less) — the `/demo` route's top nav crammed
  all four sections into one horizontally-scrolling row, so mobile users had to slide to
  reach later tabs. Now mirrors the authenticated app: desktop keeps the inline top nav,
  mobile gets a fixed bottom tab bar. files: `DemoBottomTabBar.svelte` · `DemoNav.svelte`
  · `demo/+layout.svelte` · ADR-0026
- **PR #475** Remove the "Auth help" link from sign-in (issue-less) — pointed at
  `/auth/error`, a generic error-redirect landing page, not a help resource for
  signed-out visitors. file: `src/routes/auth/+page.svelte`
- **PR #474** Link to the public demo from the sign-in/sign-up screen (issue-less) —
  `/auth` was the one page unauthenticated visitors already land on, but nothing
  pointed at the `/demo` marketing snapshot (ADR-0026) from inside the app. file:
  `src/routes/auth/+page.svelte`

## 2026-07-08

- **#231** Rebrand Sunday Bets → Hotshot — de-gamble the identity (the stake is bragging
  rights, not cash) and swap the product name across the UI/copy surface (title, header,
  auth, install/push copy, Commissioner persona) plus the PWA manifest and human-facing
  docs. Regenerates the app icon set from the new charcoal + gold football/spark mark (the
  in-app mark now ships as a transparent SVG) and fixes manifest color drift, and reworks
  the pick card onto the brand palette — team and weight share one charcoal input tier whose
  selected states climb an ember ladder (weight tint → team fill → Lock-in CTA), with a
  higher-contrast, tighter header and the Clear-pick reset moved off the CTA — activating the
  dormant ember spark accent (also on the demo sign-up CTA). "Hotshot" is the name;
  `hotshotcalls.com` is domain-only.
  files: `vite.config.ts` · `app.html` · `app.css` · `AppHeader.svelte` · `TeamSelect.svelte` ·
  `WeightSelect.svelte` · `LockControls.svelte` · `GameCard.svelte` · `DemoSignupCta.svelte` ·
  ADR-0027
- **PR #469** Tag Sentry environment from `VERCEL_ENV` instead of defaulting to
  production (issue-less) — server-side `Sentry.init()` never set `environment`, so
  Sentry's default fallback mislabeled every local `pnpm dev` error as `production`,
  which had been masking a dev-only ENOENT (SvelteKit's `write_types` sync racing a
  file-watcher event) as a false prod incident. file: `instrumentation.server.ts`
- **PR #467** Fix CLS from the PWA engagement banner (issue-less) — `EngagementBanner`
  used to render in normal document flow above page content, so its late,
  post-hydration appearance (gated on `computeStep()` awaiting
  `navigator.serviceWorker.ready`) pushed the page down and scored as layout shift.
  Now renders as a fixed, bottom-docked overlay instead, so its appearance never
  displaces already-rendered content. file: `EngagementBanner.svelte`
- **#460** Public shareable demo season — an unauthenticated `/demo` link renders one
  fully-fictional season from a committed, generated snapshot: a frozen "live" week picks
  screen (the verb) plus the completed-season leaderboard, awards/badges, Season Wrapped, and
  frozen AI recaps, all read-only with sign-up CTAs, viewed as a "you" persona. No live DB
  reads or LLM calls at serve time; isolation from real gameplay is structural (no demo rows in
  prod). `pnpm demo:snapshot` re-derives the fixture through the real grading → awards →
  Wrapped → recap pipeline; a CI drift-guard test + the `refresh-demo-snapshot` skill + an
  AGENTS.md rule keep it from rotting. routes: `/demo/**` · fixture: `lib/server/demo/` ·
  export: `api/cron/demo-snapshot` · ADR-0026
- **PR #463** Governance-freshness repair on master — backfilled the ADR-0024 and #452/#462
  CHANGELOG entries the freshness check was flagging, restoring a green `governance` gate.
  docs-only
- **PR #466** Release v2.13.0 — version bump. Milestone: v2.13 (minor: #446 explicit
  "Lock in" button + pick-card polish; patch: #450 ESPN scoreboard as primary source
  of final scores, #445 admin grading tile UX driven by human pickers).
- **#433** Grade-cron reconcile sweep — the grade cron now self-heals any week that has
  final scores but was never settled (e.g. a week missed during its normal processing
  window), settling those picks without the recap/AI/push/Wrapped fan-out that stays
  scoped to recent weeks. Frozen (grading-locked) seasons and already-settled weeks are
  left untouched. fn: find_unsettled_weeks · file: cron/grade/+server.ts · follow-up to #430
- **#450** ESPN scoreboard as the primary source of final scores — grading now reads finals
  from the ESPN scoreboard, matched by matchup identity with ESPN's explicit home/away (no
  name fuzzing, no `daysFrom` window, so late grades/re-grades/backfills use one path), and
  falls back per-game to The Odds API `/scores` for provider independence. Raw ESPN payloads
  are retained for audit. table: espn_api_responses · files: schedule.ts, grading.ts · ADR-0025
- **PR #452** ADR-only — records ESPN scoreboard as the primary source of final scores
  (the Odds API `/scores` window can't cover late grades, re-grades, or historical
  backfills, and its team-name fuzzy match re-derives identity the schedule model
  already owns). Decision doc only; no code or schema change. ADR-0025
- **PR #462** ADR-only — records serving a public, unauthenticated demo season from a
  generated read-only snapshot so a stranger can see the finished experience without
  exposing the owner's real league and without demo rows ever entering production
  tables/standings. Decision doc only; no code or schema change. ADR-0026
- **PR #445** Admin Grading tile UX — the `/admin` grading card now drives off human
  pickers (a week dropdown with the active week preselected, a lazy game picker by
  matchup, a season picker) instead of raw database ids, with a pull-latest-finals
  toggle, a confirm step, and a settled-counts summary after each run. Adds an
  admin-gated games-by-week lookup. route: `/api/admin/week-games` · files:
  `admin/GradingCard.svelte` · `server/grading.ts` · `server/admin.ts`
- **PR #446** Explicit "Lock in" on the picks board + pick-card polish (issue-less) — replaces
  auto-save-on-complete with a per-card **Lock in** button (a pick persists only once a team and
  weight are chosen and you tap it) plus an **Unlock** control on committed picks, dropping the
  "choose a weight" hint. Also elevates the pick-card line and kickoff time and shortens the ATS
  trend nugget wording. Client-only — the pick save/unlock RPCs are reused unchanged. files: picks
  board components + picks store.
- **PR #461** Release v2.12.0 — version bump. Milestone: v2.12 (minor: #441 reorganize
  /league into slate hero + Teams/Trends sub-tabs, #442 Last-5-seasons scope toggle on
  /league Trends; patch: #447 grading integrity membership-scoped penalty + frozen
  imported seasons, #443 league mobile-fit + Saturday primetime slot, #444 real
  2022-2024 kickoff-times backfill, PR #449 dev boot speed, PR #448 demo-seed depth).
  Production ships via the separate manual `deploy-prod` dispatch, which tags `v2.12.0`
  (ADR-0010). · ADR-0015
- **#447** Grading integrity — the missed-pick penalty now applies to every active league
  member; the app admin was silently exempt through the global user role, which flipped the
  2022 champion after the #430 re-grade. Also freezes imported pre-2025 seasons from grading so
  no future re-grade can re-derive their sheet-sourced settlements. tables: seasons ·
  fn: grade_games_by_ids · ADR-0024
- **PR #449** Faster local dev boot + fix worktree port override (issue-less) — disables the
  PWA plugin's dev-mode service-worker generation by default (it re-ran a full Workbox
  precache scan on every `pnpm dev` boot; opt in with `PWA_DEV=true`), and fixes the
  `pnpm run dev -- --port N` pattern documented across the repo, which pnpm 10 silently
  broke by forwarding a literal `--` to Vite's CLI so the port override was ignored. file:
  `vite.config.ts` · script: `scripts/new-worktree.ps1`
- **PR #443** League tab mobile fit + Saturday-night primetime slot (issue-less) — trims the
  Teams ATS table to `Team/ATS/Cover%/SU` (drops the redundant games count and moves the
  home/away & fav/dog splits into the per-team drill-down, which now paints instantly and no
  longer jumps on load), drops the redundant `n` column from the Primetime/Divisional cuts, and
  adds a `SAT` (Saturday night) kickoff slot so late-season Saturday games are no longer counted
  as daytime. view: league_ats_primetime · files: league `/league` page + Trends cards. ADR-0013
- **PR #444** Backfill real 2022-2024 kickoff times (issue-less) — replaces the synthetic
  2pm-ET kickoff times for the 2022-2024 seasons with real ESPN times so the `/league` primetime
  split can classify TNF/SNF/MNF/SAT games. Applied to staging + prod. files: backfill script
  under `supabase/scripts`.
- **PR #442** "Last 5 seasons" scope toggle on /league Trends (issue-less) — adds a scope
  toggle so the Trends ATS cuts can be viewed over the last five seasons instead of all-time.
  files: league `/league` Trends cards.
- **PR #441** Reorganize /league into slate hero + Teams/Trends sub-tabs (issue-less) —
  restructures the `/league` page into a forward-looking slate hero with Teams and Trends
  sub-tabs. files: league `/league` page.
- **PR #440** Backfill changelog for PR #435 and PR #420 (issue-less, docs) — adds the
  missing shipped-history entries for two earlier league PRs. file: docs/CHANGELOG.md.
- **PR #448** Demo seed — in-season depth for the pick-card ATS nuggets (issue-less) — the
  local demo seed's current (in-progress) season now carries a deep completed history before
  its live week, so the `/picks` ATS trend nuggets and the `/league` situational cuts
  (divisional, primetime) actually render in the offseason instead of falling below their
  sample floors. Seed tooling only — no schema, migration, or runtime change. file:
  `seed-demo/index.ts`.
- **PR #435** Reorder bottom nav tabs (issue-less) — regroups the bottom tab bar so the
  social tabs cluster apart from the analytics tabs, matching how the sections are used. Nav
  order only, no behavior change. file: bottom tab navigation.

## 2026-07-07

- **#429** League tab — This Week slate — a forward-looking slate on `/league`: the current
  season's upcoming scoring-week games, each side annotated with its situational ATS split
  (the pick-card nugget data) and deep-linking to that game on `/picks`. Week- and
  line-sensitive, so it reads a distinct, non-persisted cache that revalidates on load rather
  than the season-cached graded modules; the offseason/bye shows an empty state. Reuses the
  shipped `league_ats_situational` view + `ui_games` — no migration. route: `/api/league/slate`
  · views: `league_ats_situational` · `ui_games` · files: `league/WeekSlate.svelte` ·
  `utils/leagueSlate.ts` · `league/+page.svelte` · ADR-0013 · ADR-0017. Closes #429.
- **#428** League tab Hot/Cold + team drill-down — adds a Hot/Cold module on `/league`
  listing each team's current ATS cover streak and last-4 form, and an expandable per-team
  drill-down showing that team's full season game log (opponent, line, cover margin, ATS
  result) fetched on open. Reads the `league_ats_streaks` view and the `league_ats_base`
  matview from #425; no migration. views: `league_ats_streaks` · matview: `league_ats_base`
  · route: `/league`, `/api/league/team` · ADR-0013 · ADR-0017

- **#426** League tab v2 market cuts (UI) — two new read modules on `/league`: favorite
  cover % by spread-size bucket, and the four league-wide home/away × favorite/underdog cover
  rates. Both read #425's views through the single season-cached league payload, reusing the
  shared cover-% helper (no cover math duplicated); thin buckets show a sample caveat instead
  of a noisy rate. No migration. components: `league/SpreadBuckets.svelte` ·
  `league/Quadrants.svelte` · route: `/league` · views: `league_ats_spread_buckets` ·
  `league_ats_quadrants` · ADR-0013 · ADR-0017
- **#427** League tab — primetime & divisional modules — two new `/league` situational
  modules: favorite ATS cover rate by kickoff slot (TNF/SNF/MNF vs daytime) and for
  divisional vs non-divisional matchups. Reads the DST-safe views from #425 through the same
  cached single payload; thin cells carry an `n=` small-sample caveat. views:
  `league_ats_primetime` · `league_ats_divisional` · route: `/league` · ADR-0013 · ADR-0017
- **#425** League tab v2 DB foundation — one consolidating migration for the League tab v2
  epic (#424) so the later UI waves read already-typed views and generate no migrations of
  their own. Widens the `league_ats_base` matview with team-relative spread/margin, kickoff
  time and opponent; adds `teams.division`/`conference` (seeded for the 32 NFL teams); and
  adds five service-role aggregate views — spread-size buckets, home/away × favorite/underdog
  quadrants, primetime kickoff slots, divisional splits, and ATS streaks. No user-facing
  change. matview: `league_ats_base` · views: `league_ats_spread_buckets` ·
  `league_ats_quadrants` · `league_ats_primetime` · `league_ats_divisional` ·
  `league_ats_streaks` · table: `teams` · ADR-0013 · ADR-0002
- **PR #420** League-wide team ATS trends tab (#406, PR 1 of 2) — introduces the `/league`
  tab as a 5th nav destination with the per-team ATS table plus favorites-vs-underdogs and
  home/away modules, all reading a new materialized league ATS surface through a season-cached
  client payload. Foundation the pick-card nugget (PR 2) and the v2 waves build on. route:
  `/league`, `/api/league` · views: `league_ats_*` · matview: `league_ats_base` · ADR-0013 ·
  ADR-0017
- **PR #432** `start-issue` skill now runs the full delivery loop (issue-less) —
  previously stopped after worktree setup and printing the dev command; now
  continues straight into implementation and hands off to `finish-pr` to test and
  open the PR, instead of waiting for a separate invocation. file:
  `.claude/skills/start-issue/SKILL.md`
- **PR #431** Release v2.11.0 — version bump. Milestone: v2.11 (minor: #416 AI
  badge-voice override, #406 League ATS trends; patch: #418 agent workflow
  improvements, PR #423 Season Wrapped promo mobile layout fix). Production ships via
  the separate manual `deploy-prod` dispatch, which tags `v2.11.0` (ADR-0010). ·
  ADR-0015
- **PR #423** Season Wrapped promo mobile layout fix (issue-less) — the promo banner's
  `flex-wrap` row let the gift icon, text, and **View Wrapped** button compete for one
  line on narrow screens, collapsing the title into a 2–3-word column. Now stacks
  vertically below `sm:`, restoring the side-by-side layout at `sm:` and up; desktop
  unchanged. Class-only change. file: `WrappedPromo.svelte`
- **#406** League ATS trends (PR 2 of 2) — the pick-card **ATS trend nugget**: each upcoming
  game card shows one muted line per team with that team's record against the spread in this
  game's exact situation (home/away × favorite/underdog, e.g. "6-2 ATS as home favorite
  (n=8)"), omitted for pick'ems or below a small sample threshold. A per-user **Settings
  toggle** ("Show team trends on picks", default on) hides it. Reads the shared
  `league_ats_base` matview through a new `league_ats_situational` view — the tab and the
  nugget never compute cover math two ways. view: `league_ats_situational` · column:
  `users.show_team_trends` · files: `picks/GameCard.svelte` · `utils/leagueNugget.ts` ·
  ADR-0013 · ADR-0002. Closes #406. Also folds in agent-DX follow-ups to PR #421: hardened
  `new-worktree.ps1` (no longer aborts before env-copy/install under a caller's `2>&1`), a
  single-pgTAP-file note in `testing.md`, and a `per-user-profile-preference` recipe.
- **PR #421** Agent-DX doc & tooling fixes (issue-less chore) — documented three gaps
  hit while building #406: worktrees can't prod-clone (`db:reset:local` / `cloneDb.ts`
  need `SUPABASE_DB_URL_PROD`, absent from worktree `.env*`) and the migration
  generator's emit order (alphabetical within folder; views before functions), and
  added a `docs/agent-context/recipes/` subfolder for end-to-end procedures with a
  materialized-read-surface recipe. files: `db-migration` skill · `database.md` ·
  `cloneDb.ts` · `.env.example` · `recipes/`
- **#406** League ATS trends (PR 1 of 2) — new top-level **League** tab (5th nav tab,
  `/league`) showing league-wide, spreads-only NFL team performance against the spread:
  favorite/underdog cover %, a sortable per-team ATS table with home/away + favorite/underdog
  splits, and league home/away splits. Descriptive and group-independent (identical for
  every user), served from a service-role matview refreshed on the existing grading run.
  matview + views: `league_ats_base` · `league_ats_team` · `league_ats_fav_dog` ·
  `league_ats_home_away` · route: `/league` · ADR-0013 · ADR-0002
- **#416** AI badge-voice override — each **crowned** season badge now shows a
  personalized, AI-generated one-liner (naming the holder and the stat that earned it)
  overriding the static tagline; the award stays deterministic and any gateway
  failure/over-budget path falls back to the exact static copy. Generated at season
  finalization and a manual backfill cron, overlaid onto the badge read-model for
  complete seasons only. Closes epic #283 (final wave). table: `ai_badge_flavors` ·
  route: `api/cron/backfill-badge-flavors` · ADR-0008 · ADR-0002

## 2026-07-06

- **PR #418** Agent workflow improvements — four new skills (`land-pr`, `ci-triage`,
  `season-ops`, `dependabot-sweep`) closing gaps in the delivery loop; the
  non-interactive-shell PATH fix moved from a per-command workaround to
  `.claude/settings.json`; and a PR-time changelog gate added to
  `governance-freshness.yml` so a missing entry is caught before merge instead of via
  a backfill PR. Also fixes a doc bug in `testing.md`/`test-gate` that mis-described
  CI's test coverage.
- **PR #417** Release v2.10.0 — version bump. Milestone: v2.10 (minor: #360 All-In
  signature moment + The Whale badge, #388 who's-picked status board, #397 comeback &
  weekly honors badges; patch: #382 raw Odds API payload persistence, #390 clone-to-staging
  trigger fix, #391 changelog repair, #392 set-based RLS guard). Production ships via the
  separate manual `deploy-prod` dispatch, which tags `v2.10.0` (ADR-0010). · ADR-0015
- **#388** Who's-picked status board — group-visible, **counts-only** pick status for
  the active week: each active member's picks-made-vs-available count (e.g. 9/13) plus
  a done/pending flag, never any pick content. A `SECURITY DEFINER` RPC re-imposes the
  `is_member()` gate and projects counts only, so co-member counts show pre-kickoff
  while base-table picks RLS keeps pick content sealed (same mechanism as ADR-0023's
  all-in surface). function: `picks_status_board` · component: `PicksStatusBoard.svelte`
  · route: `/picks` · ADR-0019
- **#382** Persist raw Odds API payloads — stores each Odds API response verbatim for
  later dispute resolution / replay, alongside the parsed lines it already ingests. No
  new ADR (audit-log precedent, ADR-0011). table: `odds_api_responses` ·
  `oddsApiResponses.ts` · pgTAP `037`
- **PR #412** Backfill the CHANGELOG entry for PR #410 (the docs-only skip-jobs CI
  change). Docs-only.
- **#392** RLS-enable guard — new set-based pgTAP assertion (one pass over
  `pg_class.relrowsecurity`) fails CI if any `public` base table ships without RLS
  enabled, closing the audit's P2 #9 gap so a forgotten enable line can't silently
  expose full-table reads to `authenticated`. Self-verifying via a born-without-RLS
  probe. The `0300_rls.sql` collapse was already shipped by PR #379. test:
  `supabase/tests/039_all_tables_rls_enabled.sql` · ADR-0011
- **PR #410** Skip unit/build/smoke for docs-only PRs — adds a `detect-changes` job
  (the `dorny/paths-filter` pattern already used by `ci-pgtap.yml` /
  `ci-migration-verify.yml`) to `ci-tests.yml` and `playwright.yml`; `unit`, `build`,
  `smoke`, and `full` now skip when every changed file is under `docs/**` or `*.md`,
  via `unit-result`/`build-result`/`smoke-result` wrapper jobs so required-status
  checks still report a conclusion instead of relying on GitHub treating a skipped
  job as passing. `lint` and `governance` stay ungated — both check things relevant to
  docs-only PRs. Follow-up (not done here): the branch ruleset still lists the raw
  `unit`/`build`/`smoke` names as required checks and needs updating to the
  `-result` variants before docs-only PRs actually stop blocking. files:
  `.github/workflows/{ci-tests,playwright}.yml`
- **#391** Backfill v2.8 CHANGELOG gaps — adds standalone entries for #302, PR #352,
  PR #355, PR #356, PR #363, and PR #364 (missing from the v2.8 release rollup line)
  and resolves the literal `PR #NNN` placeholder in the 2026-06-30 section to its real
  number, `PR #354`. Docs-only.
- **PR #409** Accept ADR-0023 (All-In signature moment) — flips ADR-0023 status
  `Proposed` → `Accepted` and adds its `docs/adr/README.md` index row (missed by the
  propose PR), clearing the ADR gate so #360's implementation (declarations view/RPC,
  weight-scoped RLS, pgTAP, The Whale badge) can proceed in its own PR. Docs-only.
  files: `docs/adr/0023-all-in-signature-moment.md`, `docs/adr/README.md` · ADR-0023
- **PR #407** Propose ADR-0023: All-In as a signature moment — a locked All-In
  (`weight='A'`) pick becomes visible to co-members immediately on lock (game + side/
  team + weight), a narrow extension of ADR-0019's sealed-envelope boundary scoped to
  All-In only; every other weight stays sealed until kickoff. Declaration is automatic
  — locking an All-In _is_ the declaration, no opt-in gesture. Drops the originally
  scoped per-season scarcity budget (the existing weekly cap is unchanged) and renames
  the badge from "Guarantee" to **The Whale** (best All-In record, non-scoring, mirrors
  ADR-0020's The Choker). Docs-only; implementation follows in a separate PR. file:
  `docs/adr/0023-all-in-signature-moment.md` · ADR-0023 (extends ADR-0019)
- **PR #404** Propose ADR-0021: caller-scoped standings RPC for non-web clients —
  records the decision gating the mobile companion app (PR #394) graduating from
  experiment to a supported client: since standings matviews are service-role only
  (ADR-0013) and can't carry RLS, a backendless client must go through a single
  `SECURITY DEFINER` RPC over the leaderboard matviews, filtered by
  `auth.uid() → group_memberships`, with pgTAP cross-group-denial coverage. Gates
  graduation only — PR #394 stays parked with its client-side mirror meanwhile.
  Status: Proposed. Docs-only. file: `docs/adr/0021-caller-scoped-standings-rpc.md` ·
  ADR-0021
- **PR #403** Auto-union CHANGELOG.md merge conflicts — adds `.gitattributes`
  (`docs/CHANGELOG.md merge=union`) so same-day changelog bullet collisions
  auto-resolve instead of raising a manual merge conflict, automating the "keep both
  entries" policy this file already documents (conflicts had hit #398, #399, and #402
  this week). Config-only. file: `.gitattributes`
- **#400** Over/Under (totals) market — **decision: deferred** for 2026, no code
  change. Records that head-to-head comparison forbids per-player market choice — the
  market must be a collective, group-level setting — and fixes the shape to adopt if it
  is ever built: a per-group, season-long spread-vs-totals mode. file:
  `docs/adr/0022-over-under-totals-market.md` · ADR-0022
- **PR #401** Backfill missing CHANGELOG entry for PR #398 — PR #398 (ADR-0020, #109
  catch-up mechanics) merged without a `docs/CHANGELOG.md` entry, tripping the
  governance-freshness gate for every PR after it; the entry now lives above under
  **#109**. Docs-only.
- **#383** Accept ADR-0019 (configurable pick-reveal timing model) — adopts the
  two-axis Sealed/Deadline/Open reveal-timing model conceptually while keeping Sealed
  as the sole implemented default, codifies the non-retroactive invariant (mirrors
  ADR-0018), and authorizes a narrow counts-only status carve-out (group-scoped,
  `is_member()`-scoped, `security_invoker`, pgTAP-proven) for #388's who's-picked
  status board. Mode granularity and market fit (CFB vs NFL) explicitly deferred.
  Docs-only. file: `docs/adr/0019-pick-reveal-timing-model.md` · ADR-0019
- **#397** Comeback & weekly honors — four non-scoring recognition badges (The
  Comeback, Week Winner, Best of the Rest, Cardiac) for trailing/mid-pack players,
  reusing `week_points`/`cumulative_rank_this_week` already fetched by every `/stats`
  load (no new query, no matview change). file: `domain/badges.ts` · ADR-0020
- **#109** Ratify ADR-0020 (catch-up mechanics — no scoring equalizer) — decides against
  a points-equalizer mechanic for trailing players, grounded in the league's real
  2022–2025 history (frequent late comebacks already occur; a 2024 98-point runaway
  shows an equalizer would misfire). Engagement for trailing players is redirected to
  non-scoring honor badges, tracked separately as #397. No change to `pick_settlement`,
  matviews, or grading. file: `docs/adr/0020-catch-up-mechanics.md` · ADR-0020
- **PR #396** Release v2.9.0 — version bump for the v2.9 milestone: All-time (career)
  group leaderboard (#376), broken signup/reset confirmation email links + check-email
  UX (#367/#368), and the iOS Share glyph install-banner polish (#380/#385). No app
  behavior change beyond what those PRs already shipped. file: `package.json`

## 2026-07-03

- **PR #384** Drop app-shell chrome on the auth screen — `/auth*` rendered the app logo
  twice (persistent app-shell header + the auth card's own brand lockup from #373) and
  surfaced primary nav links above the sign-in form. Now `/auth*` is a bare, centered
  launch/login screen with a single brand lockup; authenticated routes are unchanged.
  Presentational fix, no ADR. file: `src/routes/+layout.svelte`
- **#380** Sharpen iOS install onboarding — the `install-ios` engagement banner now
  shows Apple's Share glyph (□↑) inline beside the word "Share" so non-technical
  iPhone users can find the action; adds an on-device iOS 16.4+ install→permission→push
  verification runbook (the path is uncoverable in CI). Client-only polish over the
  already-shipped push infra (#92); no ADR, no DB/backend change. files:
  `components/pwa/EngagementBanner.svelte` · `docs/runbooks/ios-pwa-install-verification.md`

## 2026-07-02

- **PR #379** Audit remediation — fix staging clone gating, collapse duplicate RLS source, add governance freshness gate — three P1 fixes from the 2026-07-02 pattern audit (`docs/audits/2026-07-02-pattern-audit.md`). `clone-to-staging.yml` now triggers on `deploy-prod.yml` completing (the real release signal) instead of every push to `master`, and no longer polls the deleted `migrate-db.yml`, closing the window where staging's schema could run ahead of prod before receiving a prod data restore; `README.md`'s stale workflow pointers are corrected. `supabase/src/schemas/0300_rls.sql` — a dead, already-drifted duplicate of `supabase/src/policies/*` — is collapsed to a documentary no-op via an explicit migration, making `policies/` the sole RLS source of truth (verified live: 59 policies, no duplicates, RLS enabled on all 25 tables). A new `governance:check` CI job (`.github/workflows/governance-freshness.yml`) fails when a shipped ADR is still `Proposed`, or a merged PR (post-cutoff) has no `docs/CHANGELOG.md` entry. files: `.github/workflows/{clone-to-staging,governance-freshness}.yml`, `README.md`, `supabase/src/schemas/0300_rls.sql`, `supabase/migrations/20260702200954_collapse_legacy_rls_schema_file.sql`, `scripts/check-governance-freshness.ts`
- **PR #379** Ratify ADR-0013/0015/0016/0018 (all Accepted) — the new governance-freshness gate (above) caught all four as shipped-but-still-`Proposed`: ADR-0013 (materialized leaderboard/stats, #191), ADR-0015 (label-driven SemVer, #265), ADR-0016 (non-scoring rounds, #274), ADR-0018 (non-retroactive drop-worst-week, #357, supersedes ADR-0005). Every linked issue is closed and the decisions have been governing shipped code for days to weeks; flipping them also fixes the ADR-0005→ADR-0018 supersession chain (a terminal "superseded" record pointing at a non-Accepted ADR). Docs-only. files: `docs/adr/{0013,0015,0016,0018}-*.md` · ADR-0013 · ADR-0015 · ADR-0016 · ADR-0018
- **PR #377** Merge dependabot dependency updates — combines the two open dependabot PRs (#372 production-dependencies, #375 dev-dependencies) into one; pins `layerchart` back to `1.0.13` because the `2.0.0` bump in #372 drops the `aboveMarks` named-slot API `SeasonTrendChart.svelte` depends on (broke `svelte-check`), and reformats a handful of files for the newer prettier pulled in by the dev-dependencies group. Routine dependency maintenance, no behavior change. files: `package.json`, `pnpm-lock.yaml`
- **PR #373** Sign-in card brand block — the auth card showed only the mode title (Sign in / Create account / Forgot password) with no app identity, so it wasn't obvious which app it belonged to. Adds a centered brand block (logo mark, "SUNDAY BETS" wordmark, one-line tagline) above the mode title across all three auth modes. UI-only, no schema/behavior change. files: `src/routes/auth/+page.svelte`
- **#376** All-time (career) group leaderboard — a third "All-time" tab on the
  Leaderboard, next to Standings and Weekly, ranking `stats_alltime_totals` with a
  client-computed dense rank (`total_points desc, wins desc, pushes desc`, ties share a
  rank — no schema change) and each member's avatar joined by `user_id`. Season-
  independent: the season dropdown hides and relabels while the tab is active, and
  reappears on the prior season when switching back. files:
  `readModels/leaderboardCache.ts`, `domain/leaderboard.ts`, `api/leaderboard/alltime`,
  `leaderboard/+page.svelte` · ADR-0017 / ADR-0018
- **PR #374** Self-heal staging `auth.users` FK gap in `clone-to-staging` — the workflow only ever restored the `public` schema, but `public.users.id` FKs to `auth.users(id)` and staging's `auth.users` was seeded once manually; any prod user who signed up afterward broke the clone with a FK violation on `pg_restore`. Adds a step that mirrors missing prod `auth.users` ids into staging as inert placeholder rows (`<id>@placeholder.local`, unconfirmed, no password, no PII) before the restore runs. files: `.github/workflows/clone-to-staging.yml`

## 2026-07-01

- **PR #369** Release v2.8.0 — version bump. Milestone: v2.8 (minor: #358 drop-worst-week UX, #347 Season Wrapped in-app, #302 recap push notification; patch: #357 non-retroactive drop-worst-week fix, PR #351 Wrapped seasonal CTA, PR #352 awards guide on Wrapped, PR #353 recap voice + storyline facts, PR #354 Wrapped force-refresh cron, PR #355 stats season-switch fix, PR #356 show group name, PR #363 awards legend reword, PR #364 Manage tab split).
- **#367** Fix broken signup/reset confirmation email links + post-signup check-email UX — `supabase/config.toml` only customized the magic-link email template, so signup-confirmation and password-reset emails fell back to Supabase's default template, which drops the `token_hash`/`type` params `/auth/confirm` and `/auth/reset` require ("Missing token" even though the account was actually confirmed). Adds `confirmation.html`/`recovery.html` templates mirroring the existing magic-link pattern. Also replaces the post-signup toast with a dedicated "check your email" screen (resend action, back-to-sign-in). Prod/staging Dashboard templates still need a manual paste (config.toml only reaches local). files: `supabase/config.toml`, `supabase/confirmation.html`, `supabase/recovery.html`, `auth/+page.svelte`, `auth/+page.server.ts` · ADR-0004
- **#358** Drop-worst-week UX — commissioner control + standings/analytics split. Phase 2 (UX) of the #357 redesign: commissioners can now enable the rule and pick "apply from season \_\_\_" from the group Manage tab (no more service-role-only writes; copy states it affects standings only and is never retroactive). Draws a sharp line between standings and performance — the Stats season card drops Points + Rank (analytics only; Leaderboard owns standings), the season trend rings the forgiven week with a caption while the line stays raw, the Career headline reads "Standings points" (reconciled) with a per-season-drop caption, and the Leaderboard gains a footnote when the drop is active for the displayed season. No DB change. files: `group/+page.svelte`+`+page.server.ts`, `api/group/update-config`, `stats/+page.svelte`, `CareerSummary.svelte`, `SeasonTrendChart.svelte`, `utils/stats.ts`, `leaderboard/+page.svelte`, `readModels/{leaderboard,stats}Cache.ts`, `domain/scoring.ts` · ADR-0018
- **#302** Recap push notification + cross-device seen-marker — once a group's weekly AI recap generates in the grade cron, opted-in members get a "recap ready" push to `/recap`, reusing the #178 `notification_log` dedup shape but keyed per `(user, group, week)` via a new nullable `notification_log.group_id`, gated by a new `notification_prefs.ai_recap` toggle (default on). The once-per-week `/recap` flash "seen" marker moves from per-device `localStorage` to a server-side `recap_seen` table (RLS-gated, player-writable) so dismissal is consistent across a player's devices. tables: `recap_seen`, `notification_log.group_id` · files: `notifications.ts`, `api/cron/grade`, `api/recap/mark-seen`, `RecapFlash.svelte` · ADR-0008
- **PR #364** Split commissioner controls into a Manage tab — the Group page's commissioner-only config (rename, invites, league rules, AI Recap) moves off the shared page into a dedicated `League | Manage` tab set; the League tab keeps everything every member sees (honors, roster, leave-group). Non-commissioners see no tab bar — their page is unchanged. Presentation-only. file: `group/+page.svelte`
- **PR #363** Reword the awards guide as a "legend" — the "How awards work?" trigger/dialog framed the badge list as step-by-step mechanics; reworded to "Awards legend" to match what it actually is, a reference of what each badge means (plus matching comment updates). files: `AwardsGuide.svelte`, `badges.ts`, `honors.ts`

## 2026-06-30

- **#357** Non-retroactive drop-worst-week + standings reconciliation — fixes two defects in the ADR-0005 drop-worst-week rule: it applied retroactively to the imported 2022–2024 seasons the instant a group enabled it, and career totals diverged from the sum of the season cards. Adds a `drop_worst_week_start_year` config field so the rule never reaches a season before it (inert by construction without one), reworks career totals to sum each season's drop-aware standings total, and adds a season-trend `is_dropped_week` marker (trend stays raw; it's an annotation, not a second total). Records/breakdowns stay raw everywhere. views: `leaderboard_season_totals`, `stats_alltime_totals`, `stats_season_trend`, `league_completed_standings` · function: `update_group_config` · ADR-0018 (supersedes ADR-0005)
- **PR #354** Season Wrapped force-refresh — adds `?force=true` to the manual `backfill-wrapped` cron so existing Wrapped blurbs are regenerated and replaced (fresh AI prose) instead of skipped, with each subject re-voiced before its old row is dropped so a failed voice keeps the existing blurb. New `pnpm refresh-wrapped:prod` wrapper POSTs the endpoint (no local DB creds; sidesteps the PowerShell/CSRF friction of a raw curl). files: `seasonWrapped.ts`, `db/queries/seasonWrapped.ts`, `api/cron/backfill-wrapped`, `supabase/scripts/refresh-wrapped/` · ADR-0008
- **PR #353** AI recap voice + storyline-first facts — refines the shared Commissioner voice for the weekly recap and Season Wrapped (ADR-0008) and replaces rank-ordered standings with deterministic storyline beats: biggest rank mover, lead change, hottest win streak, and title-race tightness (weekly) plus biggest climber/faller, a lead summary, longest heater, and title margin (season). Now sends the full standings (reverses the season top/bottom-5 prompt trim from PR #351); per-call + per-season cost caps and the deterministic fallback stay as the backstop. No DB change (facts packet is JSONB; UI unchanged). files: `recap/facts.ts`, `recap/seasonFacts.ts`, `recap/voice.ts`, `types/server/recap.ts`, `types/server/seasonWrapped.ts` · ADR-0008
- **PR #356** Show the active group's name in the header — single-group users previously saw nothing in the `GroupSwitcher` slot (it only rendered for multi-group users); they now see their group's name as inert text, while multi-group users keep the dropdown. files: `AppHeader.svelte`, `GroupSwitcher.svelte`
- **PR #355** Keep the selected player when switching season on Stats — `selectedUserId` was a `$derived`, so changing the season (which gives the page data a new object identity via `goto`) silently reset the player picker back to "You"; switched to plain `$state` with an `$effect` that only repairs the selection when it's actually invalid (e.g. the player left the group). file: `stats/+page.svelte`
- **PR #352** Surface the awards guide on Season Wrapped — extracts the Group page's "How awards work?" dialog/sheet + badge glossary out of `LeagueHonors.svelte` into a reusable `AwardsGuide.svelte` and adds it to `WrappedStory.svelte` beside the player-badges and league-titles headings; glossary copy stays single-sourced. files: `AwardsGuide.svelte`, `LeagueHonors.svelte`, `WrappedStory.svelte`

## 2026-06-29

- **PR #351** Season Wrapped — seasonal CTA instead of a permanent nav tab + differentiated badges. Drops Wrapped from the primary nav (back to the four-tab IA `nav.spec` documents) and surfaces it as a seasonal moment: a dismissible `WrappedPromo` on the Leaderboard (shown only when a Wrapped exists, dismissal kept in localStorage per group/season) and a link from the Group League Honors card. On Wrapped, player badges move out of the numeric stat grid into a dedicated emoji-forward showcase, and the AI recap is reordered above the standings table. Also trims the season AI prompt to the top/bottom-5 standings edges. files: `WrappedPromo.svelte`, `WrappedStory.svelte`, `BottomTabBar.svelte`, `AppHeader.svelte`, `LeagueHonors.svelte`, `leaderboard/`, `recap/voice.ts` · ADR-0008 / ADR-0013 / ADR-0002
- **#347** Season Wrapped (in-app) — a season-end, Spotify-Wrapped-style year-in-review for every player plus the league. The season edition of the weekly AI recap engine (#284): a pure deterministic facts builder assembles each subject's packet from existing read-models (no new matviews), one AI Gateway blurb is voiced per subject under a per-group/season cost cap with the deterministic fallback on failure/over-budget, and rows persist to a new group-scoped `season_wrapped` table (RLS + grants + pgTAP, two partial unique indexes for player/league dedup). Generated at the season's final graded week off the grade cron (idempotent), with an idempotent backfill cron for the imported 2022–2024 seasons. Surfaced at a new `/wrapped` route (season picker, stat-card story, once-per-season flash). tables: `season_wrapped` · files: `src/lib/server/recap/seasonFacts.ts`, `src/lib/server/seasonWrapped.ts`, `src/lib/server/recap/voice.ts`, `src/routes/(app)/wrapped/`, `src/lib/components/wrapped/` · ADR-0008 / ADR-0013 / ADR-0002
- **#296** Hot Hand Tier-C badge + provisional/crowned lifecycle — adds a new `stats_pick_streaks` matview (gap-and-islands SQL, push-neutral, sequence-ordered) exposing `current_streak` and `max_streak` per player per season. Hot Hand title badge ranks `current_streak` in-season (provisional) and `max_streak` once the season is complete (crowned). A Provisional/Crowned status tag appears in the LeagueHonors Awards header for all badge tiers. Season-scaled sample guard gates eligibility. views: `stats_pick_streaks` · files: `badges.ts`, `stats.ts`, `LeagueHonors.svelte` · ADR-0013
- **#295** AI recap Wave 2 — rivalry narratives + resurfaced bad takes — the weekly AI recap's `RecapFacts` packet gains two deterministic enrichments: a `bad_take_selector` that surfaces each week's most roastable losing pick per player (busted All-In, backfired fade against the crowd, or a heavy pick that flopped), and top all-time rivalry pairs ranked from the lifetime head-to-head read-model (#280). The roastable-fact allowlist is now explicit and enforced (display names only, opted-out players excluded), the prompt and deterministic fallback consume both new slots, and the existing AI Gateway call + `ai_recaps` JSONB absorb the richer packet with no schema change. files: `src/lib/server/recap/facts.ts`, `src/lib/server/recap/voice.ts`, `src/lib/types/server/recap.ts` · ADR-0008
- **#328** Instant PWA tab-switch feedback — eliminates the "did my tap register?" dead time when switching tabs. A top progress bar appears on every navigation; the tapped tab highlights immediately using the pending navigation target; and navigating to Stats or Group swaps in section skeletons instead of freezing the previous page while the server load runs. Touch preload (`tap`) starts the data fetch on `touchstart` rather than `hover`. components: `NavProgress.svelte`, `BottomTabBar.svelte`, `AppHeader.svelte` · `+layout.svelte` · `app.html`

## 2026-06-28

- **PR #322** Release v2.6.0 — version bump. Milestone: v2.6 (features: #284 weekly AI recap, #294 Tier-B consensus badges, #300 display-name editing, #305 Group tab / App IA; patch: PR #297 stats fan-out, PR #298 test-gate skill, PR #311 Awards UX).

## 2026-06-29

- **PR #315** Redefine head-to-head as opposite-picks only — `stats_head_to_head` and `stats_head_to_head_alltime` now count only games where the two players backed different teams; agreement games (both picked the same side) are excluded. Missed picks are dropped by the inner-join on `picks.picked_team_id`. The Nemesis badge follows automatically (it reads the same matview). UI copy updated: section descriptions and card subtitles now read "games you disagreed on". views: `stats_head_to_head`, `stats_head_to_head_alltime` · badges: `the-nemesis` · route: `/stats`

- **PR #310** Leaderboard season history, week jump-to picker, and per-season badges — the leaderboard's Standings and Weekly tabs now accept a `?season=` param so players can browse any historical season (2022–present); the Weekly week navigator gains a clickable dropdown to jump directly to any started week instead of stepping one at a time; and the Group page's identity-badge section gets a season picker so past seasons' titles are visible while the Trophy Case / champion crown / wooden spoon stay cross-season. Pure UI wiring over existing season-parameterised queries — no DB change. New: `SeasonPicker.svelte` · routes: `/leaderboard`, `/group` · component: `LeagueHonors.svelte`, `WeeklyPicksBreakdown.svelte`

## 2026-06-28

- **#317** Chalk Eater & Dog Lover badges — two new per-season identity titles on the favorite-vs-underdog axis: **Chalk Eater** 🧱 (biggest share of picks on the spread favorite) and **Dog Lover** 🐶 (biggest share on the underdog), a natural opposite pair like Sheep/Lone Wolf. Favorite/dog is read off the line at pick time (`picks.locked_spread_value`), so no re-grade is needed; ratios are a share of all the player's picks (pick'em games dilute but never count as either side). new view: `stats_accuracy_by_line_side` · badges: `chalk-eater`, `dog-lover` · pgTAP: `031` · `src/lib/domain/badges.ts` · route: `/group` · ADR-0013

- **PR #314** Fix League Honors hiding a fully-graded season — `league_completed_standings` gated season completion on `games.status = 'final'`, but grading's `advance_week_if_complete` keys completion off `final_scores` presence. When a season's scores + pick settlements all land while game status lags at `scheduled` (an imported/backfilled season, or a status sync that stopped), a fully-graded season was hidden from the reigning-champion / trophy-case / wooden-spoon showcase — observed in prod, where 2025 was fully settled but 224/272 scoring games still read `scheduled`. The view now checks `final_scores`, mirroring the grading completion signal; the stale prod + staging game-status rows were corrected out-of-band. view: `league_completed_standings` · pgTAP: `028` · ADR-0013
- **PR #312** Default leaderboard/stats/group to the last season with standings — these pages defaulted their selected season to the active season year (`max(year)` in `seasons`), which Schedule Sync bumps to the upcoming season the moment ESPN publishes its schedule — before any game is graded — so they rendered blank rows / "No standings yet" for a season with no data. They now default to the most recent season the group actually has standings for (an explicit `?season=` still wins; the active year is the fallback for a brand-new group), and flip to the new season automatically once it has graded results. No DB change. new: `src/lib/server/seasonDefault.ts` · routes: `/leaderboard`, `/stats`, `/group`
- **PR #311** Awards UX — rename, member-first layout & a "how it works" guide — the League honors card's "Identity badges" section becomes **Awards** (the user-facing term) and pivots to a member-first layout: one row per holder with their award chips, showing only members holding ≥1 award (the full roster stays in the Members list). A new "How awards work?" guide explains each award's plain-English criteria — a Dialog on desktop, a bottom Sheet on mobile. Copy/presentation only; the deterministic badge engine is unchanged (each award gains a static `description` slot alongside its `flavor`, both overridable later by the AI voice layer). components: `LeagueHonors.svelte` · module: `src/lib/domain/badges.ts` · route: `/group` · ADR-0008
- **#305** App IA — Group tab + League Honors relocation — a fourth first-class **Group** tab joins Picks · Leaderboard · Stats in both the mobile bottom bar and desktop nav (`Users` icon), and the redundant Group link leaves the avatar dropdown (GroupSwitcher untouched). League Honors (champions, wooden spoon, identity badges) moves off `/stats` onto `/group`, shown to every member above the roster, with commissioner-only forms grouped under a gated "Manage group" section; Stats becomes pure personal history. Prerequisite for the AI recap card (#284). components: `BottomTabBar.svelte`, `AppHeader.svelte`, `HeaderAccount.svelte`, `LeagueHonors.svelte` · routes: `/group`, `/stats` · e2e: `nav.spec.ts`
- **#294** Tier-B consensus badges — Contrarian, Sheep, Oracle — new `group_pick_consensus` matview (per-pick grain: group_id, game_id, user_id) records consensus_pct, minority flag, and graded outcome for every non-missed scoring-round pick; three new title badges derive from it: The Contrarian (lowest mean consensus), The Sheep (highest), The Oracle (best minority-pick win rate above a season-scaled guard). All display alongside Tier-A badges in `LeagueHonors`. Shared matview also unblocks AI recap rivalry narratives (#283 Wave 2). view: `group_pick_consensus` · module: `src/lib/domain/badges.ts` · query: `src/lib/server/db/queries/stats.ts` · ADR-0013 · ADR-0002 · ADR-0016
- **PR #297** Speed up the `/stats` page load — roughly halves the per-load Supabase round-trips. Identity badges are now derived in-process from the season rows the load already fetches instead of re-querying five matviews; the redundant auth revalidation is dropped in favour of the hook-validated session; and the all-time Career / Head-to-head breakdowns stream in after first paint rather than blocking it (a new `{#await}` on `/stats`). Perf/refactor only — no behaviour change. files: `src/lib/domain/badges.ts`, `src/lib/server/db/queries/stats.ts`, `/stats` `+page.server.ts` + `+page.svelte` (removes `queries/badges.ts`)
- **PR #298** `finish-pr` skill — don't re-run an already-green test gate — step 1 now reuses `test-gate` results already produced on the current branch state instead of re-running the full gate, avoiding a redundant (slow) integration/e2e pass right after manual verification. Dev-workflow only. files: `.claude/skills/finish-pr/SKILL.md`
- **PR #293** Release v2.5.0 — bump `package.json` `2.4.0 → 2.5.0` for the v2.5 milestone (#279, #280, #281; base v2.4.0 + highest label `minor`); backfills missing CHANGELOG entry for #281. Production ships via the separate manual `deploy-prod` dispatch, which tags `v2.5.0` (ADR-0010). · ADR-0015
- **#281** Derived identity badges — Tier-A deterministic engine — the `LeagueHonors` hero now shows per-player badge chips: 6 superlative titles (The Degenerate, Mr. Calculated, The Choker, The Ghost, The Nemesis, The Homer) and 2 threshold milestones (Big Game Hunter, Perfect Week), derived from settled-stats matviews with a season-scaled sample guard and deterministic alphabetical tie-breaks. The card also surfaces mid-season when badges exist but no champion is crowned yet; each badge carries a flavor-text tooltip slot wired for the future AI layer (#189). Closes #281. module: `src/lib/domain/badges.ts` · query: `src/lib/server/db/queries/badges.ts` · component: `LeagueHonors.svelte` · route: `/stats` · ADR-0013 · ADR-0002
- **#280** Lifetime head-to-head records — the hidden `/stats` Head to head tab is visible and now reads all-time rivalry records across every scoring season, backed by a new service-role-only `stats_head_to_head_alltime` matview refreshed by `refresh_leaderboard_stats()`. Closes #280. view: `stats_head_to_head_alltime` · route: `/stats` · ADR-0013 · ADR-0002

## 2026-06-27

- **#279** League honors — reigning-champ crown, trophy case & wooden spoon — a `LeagueHonors` hero atop `/stats` shows the reigning champion (crown on their avatar), a trophy case of every completed season's champion (newest first), and the most-recently-completed season's last place (wooden spoon); the crown also marks the reigning champ on `/leaderboard`, distinct from the current-leader 🏆. All three honors derive from one read-model: `league_completed_standings`, a plain view over the `leaderboard_season_totals` matview filtered to seasons whose scoring-week games are all final. Presentation only — no scoring/grading change; first Wave-1 slice of epic #277. Closes #279. view: `league_completed_standings` · components: `LeagueHonors.svelte`, `UserAvatar.svelte` · routes: `/stats`, `/leaderboard` · ADR-0013 · ADR-0002
- **PR #289** Release v2.4.0 — bump `package.json` `2.3.0 → 2.4.0` for the v2.4 milestone (#274, #189, #265, #263; base v2.3.0 + highest label `minor`). Production ships via the separate manual `deploy-prod` dispatch, which tags `v2.4.0` (ADR-0010). · ADR-0015
- **#274** Non-scoring "practice / fun" rounds + ESPN preseason sourcing (ADR-0016) — a round can be marked non-scoring via the new `weeks.is_scoring` flag: players still pick and see graded results, but those settlements count zero toward standings/stats and the round is labelled "doesn't count" in the UI. Closes the prior leak where only the leaderboard week dropdown excluded preseason (grading + every matview counted them). Adds the `is_scoring` filter to all eight leaderboard/stats matviews and sources ESPN preseason (`seasontype=1`) as negative-week, non-scoring rounds. Closes #274. schema: `weeks.is_scoring` · views: 8 leaderboard/stats matviews · fn: `leaderboard_season_page` · routes: `/picks`, `/leaderboard` · ADR-0016
- **PR #285** ADR-0008 (AI integration foundation, **Accepted**) — ratifies the AI-foundation decisions settled across #189/#283/#284 into the canonical record: Vercel AI Gateway via `provider/model` strings (model = `openai/gpt-5.4`, chosen by the #189 spike); the deterministic-mechanic / AI-voice-only fairness boundary (the LLM gets a settled-facts packet and returns prose only — no DB, no tools, never decides an outcome); display-names-only input gated by a roastable-fact allowlist + per-group spice (default medium) + per-player opt-out; group-scoped AI-output tables (`ai_recaps` first) under the ADR-0011 grant/RLS baseline and ADR-0002 tenancy; `recordUsage()` metering with a per-group/week budget cap ($0.05; spike measured ~$0.006/run) and deterministic fallback; batch/cron invocation only; retention relies on the Gateway's default no-content-logging (formal ZDR is Pro/Enterprise, deferred); free to players at launch. Resurrects the previously-skipped `0008` slot and reconciles the ADR index. #189 spike done (gpt-5.4, ~$0.006/run, boundary validated → no hallucination); **Accepted**, unblocking #284 onward. Docs-only, no app/schema change. Refs #189 (not closed). files: `docs/adr/0008-ai-foundation.md`, `docs/adr/README.md` · ADR-0008 · ADR-0011 · ADR-0002
- **#263** Cache the per-request auth-hook lookups (ADR-0014, now Accepted) — authenticated requests no longer pay two uncached service-role round-trips (`users` profile + `group_memberships`) in `injectSession` on every hit. New `src/lib/server/auth-context-cache.ts` (modeled on the lazy module-singleton in `service.ts`): a `createAuthContextCache({ ttlMs, maxEntries })` factory backing a module-level, per-instance `Map` keyed by `user.id`, exposing `getAuthContext(userId, fetcher)` (lazy ~30s TTL — `AUTH_CONTEXT_TTL_MS`), `invalidateAuthContext(userId)`, and a bounded size cap (evict expired, then oldest). `hooks.server.ts` wraps the existing #190-traced `Promise.all` as the `fetcher` with the `traceSpan`/`traceDbQuery` wrappers **inside** it, so a cache miss still emits the `auth-hook.users-profile`/`auth-hook.group-memberships` Sentry DB spans and a hit emits none (hit rate reads straight off Sentry); all downstream derivation (`isAdmin`, `userProfile`, memberships, no-membership redirect, cookie-driven `resolveActiveGroupId`) unchanged. The cache is a latency optimization, never the security boundary: `requireAdmin` (`src/lib/server/auth.ts`) now re-reads `users.role` **fresh/uncached** via the service-role client (fail-closed) instead of trusting cached `locals.isAdmin`, so a demoted admin is denied immediately (not at TTL expiry) — the admin endpoints bypass RLS, so `isAdmin` is the only gate. Optional bust-on-write invalidation deferred per ADR-0014 (`invalidateAuthContext` ships unused for that follow-up). Tests: unit `auth-context-cache.test.ts` (hit/miss, lazy TTL expiry, size-cap + expired-first eviction, invalidate, write-recency refresh); integration `adminAuthz.test.ts` (stale-true `isAdmin` still 403; stale-false admin still admitted). No schema/types/migration change. Closes #263. files: `src/lib/server/auth-context-cache.ts`, `src/hooks.server.ts`, `src/lib/server/auth.ts`, `src/lib/server/__tests__/auth-context-cache.test.ts`, `tests/integration/adminAuthz.test.ts`, `docs/adr/0014-auth-context-caching.md` · ADR-0014 · ADR-0002 · ADR-0011
- **#273** Fix stats tables overflowing on mobile — the four `/stats` accuracy tables (Season + Career, by team and by weight) side-scrolled on phones. Compact them responsively without losing data: `CardContent` gets `px-2 sm:px-6` (reclaims the card gutter on mobile, desktop unchanged) and each `Table` gets `text-xs sm:text-sm`; the "Accuracy" column header is shortened to "Win %" (card titles still read "Accuracy by …"). `overflow-x-auto` retained as the safety net. UI/CSS only — no domain, server, or DB change. files: `src/routes/(app)/stats/+page.svelte`
- **#272** Fix 2026 schedule sync importing last season's games — ESPN's scoreboard endpoint silently ignores `season=` and returns the _current_ season, so the cron wrote 2025's completed games into a bogus 2026 season (18 weeks / 272 `final` games, Sept-2025 kickoffs). `fetchEspnWeek` now queries `dates=<year>` (the param ESPN actually honors) and discards any response whose `season.year` differs from the requested year; `syncSchedule` creates the season **lazily** — only once a week returns real games — so an unpublished year leaves no blank season/week shell. The bogus 2026 season was deleted from prod + staging (verified zero dependent picks/lines/results). Regression coverage: new `scheduleSync.spec.ts` (lazy creation / no-blank) + `schedule.spec.ts` cases (`dates=` URL, year-mismatch guard). Closes #272. files: `src/lib/server/schedule.ts`, `src/lib/server/scheduleSync.ts`, `src/lib/server/__tests__/{schedule,scheduleSync}.spec.ts` · ADR-0003
- **#152** Bounded, paginated leaderboards + member lists — keyset (cursor) pagination for the season leaderboard and group members list so reads stay bounded as groups grow (ADR-0002 query discipline). New service_role-only RPCs `leaderboard_season_page` / `group_members_page` / `group_season_years` over the `leaderboard_season_totals` matview (#191) and `group_memberships`+`users`, each served by a new `group_id`-leading keyset index (`idx_leaderboard_season_totals_keyset`, `idx_group_memberships_group_role_joined`); the RPCs are service_role-only because the server (not RLS) is the group_id trust boundary — granting them to `authenticated` would let any signed-in user read another group by passing its id. New `src/lib/server/pagination.ts` (opaque base64url cursor + limit clamp, default page 50) backs `getSeasonLeaderboardPage` / `getGroupMembersPage` and the leaderboard + group `+page.server.ts` loads (server/load layer only — no UI redesign; loads now thread a `nextCursor`); `getAvailableSeasons` now uses the DISTINCT `group_season_years` RPC instead of loading members×seasons rows. Also fixes a latent matview bug: `views/leaderboard_season_totals.sql` used `drop view if exists` on what is now a materialized view, so any re-emission would fail on prod — changed to `drop materialized view if exists`. Tests: unit `pagination.test.ts`; pgTAP `026` (keyset order, service_role-only, index presence); integration `pagination.test.ts` (bounded pages, keyset stability under an insert above the cursor, `EXPLAIN` confirms keyset index use). Closes #152. files: `supabase/src/functions/stats/{leaderboard_season_page,group_season_years}.sql`, `supabase/src/functions/groups/group_members_page.sql`, `supabase/src/indexes/idx_group_memberships_group_role_joined.sql`, `supabase/src/views/leaderboard_season_totals.sql`, `src/lib/server/pagination.ts`, `src/lib/server/db/queries/{leaderboard,getGroupMembers}.ts` · ADR-0002 · ADR-0013
- **#222** Surface final-week unlimited All-In context — banner on `/picks` appears only when `isLastWeek && finalWeekUnlimitedAllin` telling players they can go All-In on every pick; one sentence added to the How to Play All-In section noting the final-week exception. Copy/UI only, no domain, server, or DB change. files: `PicksBoard.svelte`, `HowToPlay.svelte`
- **#223** Cap display names (40 chars) and group size (50), truncate long names in UI — truncated name spans in the comment/member UI, a new `users_display_name_max_len` check constraint with the auth triggers clamping to 40 chars, and `redeem_invite` rejecting joins once a group hits 50 members (join page shows "group is full"). Closes #223. schema: `users_display_name_max_len` · fns: `handle_new_auth_user`, `handle_updated_auth_user`, `redeem_invite` · route: `join/[code]` · ADR-0004 · ADR-0006
- **PR #270** Pre-authorize PR push + creation in `finish-pr` — drops the confirm-before-GitHub-write gate for `git push` + `gh pr create` only (merging/closing PRs and all issue/gist/repo writes still require confirmation). Dev-workflow convenience, no app change. files: `.claude/skills/finish-pr/SKILL.md`
- **#265** Label-driven SemVer version management (ADR-0015, Proposed) — `issue-author` assigns a `semver:*` label + milestone, `finish-pr` carries them onto the PR (and no longer bumps `package.json`), and the new `cut-release` skill computes the release version from the milestone's highest `semver:` label, bumps `package.json` in a release PR, closes the milestone, and triggers the manual prod deploy. `package.json` now holds the last-shipped version between releases. Closes #265. files: ADR-0015, `issue-author`/`finish-pr`/`release-status`/`cut-release` skills, `AGENTS.md`, `docs/WORKFLOW.md` · ADR-0015 · ADR-0010
- **#192** ADR-0014 (Proposed) — auth-context caching — records the decision to cache the two per-request auth-hook lookups as a latency optimization that is never the security boundary: RLS + the `group_id` filter stay the real boundary, and `requireAdmin` must verify `users.role` fresh/uncached. Docs/ADR only; produced implementation issue #263. Closes #192. files: `docs/adr/0014-auth-context-caching.md` · ADR-0014 · ADR-0002 · ADR-0011
- **#190** Scaling observability baseline — additive instrumentation for the latency/load signals that define "measured scale" (ADR-0002): new `observability.ts` traces the leaderboard/stats/picks loads and the per-request auth-hook DB reads as Sentry spans, and new `scalingSignals.ts` feeds a `/admin` "Scaling signals" card (notification-cron duration vs the Vercel function timeout). Tier A/B thresholds documented in `docs/observability/scaling-signals.md`. No behavior/schema change. Closes #190. files: `observability.ts`, `scalingSignals.ts`, `hooks.server.ts`, admin page · ADR-0002

## 2026-06-26

- **#191** Performance: picks N+1 + materialized leaderboard/stats — collapsed the picks page's per-started-game comments/reactions N+1 into 2 batched queries, and converted the 8 leaderboard/stats aggregation views to materialized views (service_role-only, each with a unique index) refreshed by a new `refresh_leaderboard_stats()` after every grade and config toggle (best-effort, never fails the grade). Reads drop from a multi-join aggregation to an index scan. Closes #191. views→matviews + `refresh_leaderboard_stats` · `getCommentsForGames`/`getReactionsForGames` · ADR-0013
- **#177** House grading preset — `group_config.grading_preset` ('house'|'gamer', default house) selects the line rule per group; House grades on the closing line (captured write-once at first grade), and the preset is frozen per settlement (`pick_settlement.graded_preset`, backfilled 'gamer') so existing history never re-grades. The original group moved to House going forward. Closes #177. tables: `group_config`, `game_lines`, `pick_settlement` · ADR-0007 (Amendment 2026-06-26)
- **#249** Finish the ADR-0012 follow-ups — vendored the pgTAP `supabase_test_helpers` DDL into `000_setup.sql` (no more per-run network fetch), promoted `db:migration:verify` to a required CI gate now that the squashed `src/**` reproduces the baseline from empty, and flipped ADR-0012 → Accepted. Dev-infra, no app change. files: `supabase/tests/000_setup.sql`, `ci-migration-verify.yml`, ADR-0012 · ADR-0011 · ADR-0012
- **#249** Gated prod/staging reconciliation (ADR-0012 §4 post-squash) — ran the three deferred ACL/bookkeeping steps against prod + staging via the Supabase MCP under confirmation: `migration repair` to the single baseline (no DDL re-run, since prod already contains every object), dropped 2 prod-only orphan functions, and tightened `authenticated` table grants to the baseline's per-table subset (clearing the legacy `GRANT ALL`). prod + staging ACLs now match the baseline. No app behavior change. As-run record: `docs/runbooks/adr-0012-prod-reconciliation.md` · ADR-0011 · ADR-0012
- **#249** Migration history squash (ADR-0012 PR2) — collapsed 63 migrations / ~8.3k lines into a single regenerated baseline, proven (by normalized catalog hash) to reproduce both the pre-squash schema and prod. Reorganized `supabase/src/**` into one-object files and relocated the RLS helper functions ahead of the inline policies that call them so the baseline applies from empty. `db:migration:verify` now GREEN; the gated prod reconciliation was deferred (done above). Dev-infra, no app change. files: `supabase/src/**`, `*_baseline.sql`, `.migration-hash.json` · ADR-0011 · ADR-0012
- **#248** Reconcile delivery/process governance drift — promoted ADR-0010/0011 to Accepted, made each ADR header the sole status source (dropped the index Status column), backfilled missing CHANGELOG entries, extended the changelog convention to issue-less PRs (`PR #NNN`), and made the entry a hard `finish-pr` gate. Docs-only. files: `docs/adr/`, `docs/CHANGELOG.md`, `AGENTS.md`, `docs/WORKFLOW.md`, `finish-pr` skill · ADR-0001
- **PR #247** Pattern audit — layered, parallel grading of the repo's established patterns against its own standards (AGENTS.md, ADRs, agent-context packs): nine lanes scored on conformance + pattern-quality (maturity 1–5). Report only, no runtime change. file: `docs/audits/2026-06-26-pattern-audit.md`
- UI grade fixes (no issue) — five conformance/pattern patches from the pattern-audit UI lane (prop-mutation → local `$state`, writable-`$derived` clarification, dead-store deletion, extracted tab-trigger constant, moved global team-button CSS into `app.css` scope). files: `OddsSyncCard.svelte`, `WeightSelect.svelte`, `TeamSelect.svelte`, `PicksBoard.svelte`, `app.css`, `src/lib/ui/tabs.ts`, leaderboard+stats pages
- **#246** Migration drift guard — new `pnpm db:migration:verify` + a CI job that applies `supabase/src/**` from empty and diffs the resulting `public` schema against the full migration chain (normalizing ACL/owner/order noise), closing the blind spot in `db:migration:check` (ledger-hash only) that let `src/` silently drift from prod. Informational until the ADR-0012 squash fixed the apply ordering, then promoted to a required gate. Dev-infra, no app change. files: `verify-src-reproduces-migrations.ts` · ADR-0011 · ADR-0012
- **#245** `set_active_line` src↔prod reconcile — realigned `src/functions/odds/set_active_line.sql` to prod's deployed body and `service_role`-only grant (a stale src-only upsert rewrite and `authenticated` grant had drifted from prod). The generated migration is a true prod no-op that only re-syncs `src/` for from-empty regen. Dev-infra, no app change. function: `set_active_line` · ADR-0011
- **PR #244** Pattern-audit skill — adds the `pattern-audit` skill (fans out a subagent per repo layer, writes a maturity-scored report to `docs/audits/`). Dev-infra, no runtime change. dir: `.claude/skills/pattern-audit/`
- **PR #243** Closed-by-default function/table grant baseline — born-closed ACL: event-trigger function-ACL guard + one-time reconcile in `0001_role_baseline`, grants re-open only to named roles; pgTAP `021_function_grant_baseline` proves no PUBLIC/anon function surface. schemas: `0000_function_acl_guard`, `0001_role_baseline` · ADR-0011
- **PR #242** CI Vercel build fix — make the gated Vercel build run in CI (pnpm install + runtime secrets) so the version-gated deploy path works end-to-end. workflows: `deploy-prod`/`deploy-preview` · ADR-0010
- **PR #240** ADR records — adds ADR-0011 (closed-by-default grant/RLS baseline) and ADR-0012 (migration-history rebaseline/squash). Decision records, no runtime change. ADR-0011 · ADR-0012
- **PR #241** Docs — mark the app as not in active use during migration work (relaxes the live-traffic constraint on disruptive DB changes; migration discipline otherwise unchanged).
- **#214** Global picks — a pick made once is fanned out at write time to all the player's active groups, so it counts in every group (replaces single-group writes). function: `lock_pick_all_groups` · ADR-0009
- **PR #238** Gate prod deploys behind version bumps — Vercel auto-deploy off; production ships only on a `package.json` `"version"` bump (or manual dispatch), and a PR gets one preview on open/ready/reopen plus on-demand `/preview`. workflows: `deploy-prod`/`deploy-preview` · ADR-0010
- **PR #218** Comments — show the author's display name optimistically right after posting (was briefly blank until reload). component: `CommentsSection`
- **PR #237** E2E — stabilize the Playwright suite and fix a picks hydration regression it surfaced.
- **PR #236** Fix a UI button regression.
- **PR #235** Fix Svelte 5 `$state`/runes warnings flagged by `svelte-check`.
- **PR #234** E2E pipeline — per-test isolation (`resetPicksForGame` in `beforeEach`), deterministic built-preview CI runner, and smoke/full gating. dir: `tests/e2e/`
- **PR #233** E2E — decouple remaining specs from UI copy via `data-testid` anchors.
- **PR #232** E2E — decouple picks specs from UI copy via `data-testid` anchors.
- **PR #228** Update dependencies.
- **PR #227** E2E — seed games by matchup so the `uq_games_matchup` unique constraint can't collide across specs.

## 2026-06-25

- **#178** Results-recap notification — once a week is fully graded, the grade cron sends each opted-in user one push summarizing their record and net points (aggregated across all their groups), deep-linking to `/leaderboard`. New `results_recap` notification pref (default on) with a settings toggle; deduped per (user, week) via `notification_log` (`kind='results_recap'`). No schema change. files: `sendResultsRecap`/`isWeekFullyGraded` in `src/lib/server/notifications.ts`, `formatRecapBody` in `src/lib/domain/notifications.ts`, cron `api/cron/grade`, settings page
- **#153** Commissioner RLS hardening + grant/permission audit — stripped Supabase's default anon/PUBLIC ACL from every table with no anon RLS policy (anon now gets `permission denied`, not RLS-filtered rows, on `games`/`game_lines`/`results`/`totals`/`users`/`weeks`/`seasons`/`teams`/`picks`/`pick_settlement`/`settings`/`audit_log`); locked `group_memberships` INSERT to no-client-write (`with check (false)` + dropped the `insert` grant — all membership writes already flow through SECURITY DEFINER RPCs / service role); added the `group_id`-leading `idx_picks_group_game_user` index (ADR-0002 query discipline); added pgTAP `019_authz_matrix` covering the anon / member / non-member / commissioner authorization matrix. grants: `player_grants`/`zz_group_grants` · policies: `25_policies_groups` · ADR-0002 · ADR-0006
- **#220** Delete own comments — each comment a member authored shows a delete (✕) control that hard-deletes it via the existing `DELETE /api/comments/:gameId` endpoint (RLS `del_comments_own` already gates to the author). Optimistic removal with rollback on failure; UI-only change. component: `CommentsSection`
- **#92** PWA install and notification engagement prompts — platform-aware dismissible banner encourages install (iOS Share→Add, Android native prompt, or browser-menu fallback) and push notification enablement; dismissed per-device via localStorage; `beforeinstallprompt` lifted to shared module store; `hasPushSubscription()` added to push/client. components: EngagementBanner · modules: src/lib/pwa/
- **#150** Group switcher in the app shell — header dropdown lets users in more than one group switch the active group; the choice persists via the `active_group_id` cookie and reloads server data on switch. Renders only for multi-group users. component: `GroupSwitcher` · api: `/api/groups/switch` · ADR-0006
- **#151** Members list + commissioner basics — `rename_group`, `remove_member`, `promote_member`, `leave_group`, and `mint_invite` SECURITY DEFINER RPCs with last-commissioner guard (P0022) and full commissioner RLS. Group management UI at `/group` (members list, rename, promote/remove actions, invite minting/revoke/copy). functions: rename_group, remove_member, promote_member, leave_group, mint_invite · routes: `/group`, `/api/group/*` · pgTAP: 018_commissioner_basics · ADR-0006
- **#149** Join via invite flow — `/join/[code]` route: signed-in user redeems invite via `redeem_invite` RPC and lands in the group; signed-out user is sent to `/auth?next=/join/[code]` with the path preserved through both password and OAuth sign-in; friendly states for invalid/expired/revoked/exhausted codes; already-a-member routes straight to /picks. Invite preview reads through the `preview_invite` SECURITY DEFINER RPC (commissioner-only RLS would otherwise hide the invite from the invitee). routes: `src/routes/join/[code]` · auth: `src/routes/auth/+page.server.ts` (`next` param for password + OAuth) · functions: preview_invite · ADR-0006

## 2026-06-24

- **#148** Create-group flow (gated) — `create_group` SECURITY DEFINER RPC checks the global `group_creation_mode` (`gated`|`open`) and the per-user `can_create_group` capability, then atomically creates the group, seeds `group_config`, and adds the creator as commissioner; `/join` shows a name-input create form to eligible users. The gate flips to open via config, no migration. columns: `settings.group_creation_mode`, `users.can_create_group` · functions: create_group · routes: `/join` · pgTAP: 017_create_group · ADR-0006
- **#147** Invite tokens — `group_invites` table, commissioner RLS, and `redeem_invite` SECURITY DEFINER RPC. tables: group_invites · functions: is_commissioner, redeem_invite · pgTAP: 016_group_invites_rls · ADR-0006
- **#141** How to Play onboarding guide — dismissible welcome guide (Sheet on mobile, Dialog on desktop) auto-opens once for new users; shareable `/how-to-play` route; account-menu link. column: `users.guide_seen_at`
- **#188** Pre-v2 regression test suite — locks in gameplay behavior and
  group-isolation / self-sign-up boundaries before the v2.0 self-service-groups
  refactor. Adds two-group + self-signup integration fixtures, cross-group
  isolation tests (leaderboard/weekly/stats/picks), pgTAP
  `015_cross_group_stats_isolation`, All-In per-group enforcement, self-sign-up
  provisioning + multi-group determinism guard, admin-route authz (403 matrix +
  add-member group targeting), drop-worst-week via `getSeasonLeaderboard`, and the
  ATS scoring matrix. Verification only; no schema/runtime change. Bumps version to
  1.9.0. ADR-0002/0004/0005/0006
- **#186** PR-gated shipped changelog — adds this `docs/CHANGELOG.md` and wires it
  into `finish-pr`, `start-issue`, `AGENTS.md`, and `docs/WORKFLOW.md`.
- **#185** ADR-0007: line-and-lock grading preset (House vs Gamer) — decision record,
  no runtime change. ADR-0007
- **#176** Manage sign-in methods — list, link, and unlink auth identities.
- **#174** Harden the `cleanup-worktrees` skill against Windows removal failures.
- **#173** Graceful empty/pending state for users with no active group membership.
- **#172** Refactor leaderboard weekly cards to a team-grouped picks layout.
- **#171** Add the `cleanup-worktrees` skill and script.
- **#170** Wire `active_group_id` resolution and retire the `DEFAULT_GROUP_ID` stopgap.
