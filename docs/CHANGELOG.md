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

> History before the first entry below lives in **GitHub Releases (v1.2–v3.3)**; this
> log is not backfilled past that.

## Release squashing

The one exception to "never restructure": the `cut-release` skill collapses the
date-headed entries covering the window since the previous release tag into a single
`## v<version> — YYYY-MM-DD` heading, condensing each to one line while keeping every
`#NNN` / `PR #NNN` reference intact (the governance-freshness gate greps for them).
This only happens at release-cut time and only for that release's window — entries
from prior releases are never touched, and `finish-pr` still adds one normal dated
entry per PR the rest of the time.

## 2026-07-12

- **#567** Consolidate the `/stats` top into one scope-aware hero — the three stacked
  preamble cards (Your edge + career/season snapshot + signature strip) collapse into a
  single hero pairing the headline number line (Record · ATS% · Decisions) with the
  signature tells, and both halves re-scope with the season/Career dropdown. The scope bar
  is now the first element under the page title (no card floats above it), the redundant
  "you vs. the market" edge card is retired, and the last "Standings points" tile leaves
  `/stats` (standings stay on Leaderboard). Less scrolling to the explorer at 390px, no
  triple-shown situational edge. routes: `/stats` · new `StatsHero.svelte` /
  `SignatureTells.svelte` · removed `YourEdge.svelte` / `CareerSummary.svelte` /
  `SignatureTendencies.svelte` · `docs/DESIGN.md` · ADR-0018 / ADR-0030
- **PR #578** Stats win-loss-push text fix — the `/stats` record snippet had a
  hardcoded white text color left over from the dark-only era, making it invisible on
  the light theme. Now inherits the surrounding Card's foreground token instead. file:
  `routes/(app)/stats/+page.svelte`
- **#532** Light theme — a real "Parchment" light palette (warm paper ground, brass as
  co-lead) replaces the dead placeholder `:root`, with a per-user dark/light/system control in
  Settings stored on `users.theme_pref` and resolved onto `<html>` at SSR so first paint never
  flashes (`system` is narrowed by a blocking `prefers-color-scheme` script). Gold text/borders
  migrate to a darker `--primary-ink` so they clear AA on the light ground; the picks selection
  ladder and elevations gain light values. files: `app.css` · `app.html` · `lib/theme.ts` ·
  `hooks.server.ts` · `api/profile` · `settings/+page.svelte` · schema `0231_theme_pref` ·
  `docs/DESIGN.md` · `docs/agent-context/design-system.md` · ADR-0029
- **PR #574** Hermetic AI-gateway integration tests — the recap/wrapped/badge
  fallback suites now force the no-gateway condition instead of inheriting it from a
  dev's `.env.local`, so they stay deterministic and stop silently burning AI Gateway
  credit on local runs (CI was already gateway-less). file:
  `tests/integration/setup.ts` · ADR-0008
- **PR #572** Agent-instructions skills sweep — give new agent sessions a map of the
  `.claude/skills/` delivery pipeline + standalone utilities (`CLAUDE.md` "Skills"),
  and surface previously-undocumented workflows in `AGENTS.md`: the Hotshot naming
  rule, the `docs/DESIGN.md` merge gate, the in-app feedback boundary, and an
  Operations & observability section pointing at `docs/observability`/`runbooks`/`audits`.
  files: `CLAUDE.md` · `AGENTS.md` · ADR-0027/0028/0029/0030
- **#540** Global `prefers-reduced-motion` fallback (audit S2) — one media query in
  `app.css` now collapses every animation and transition under reduced-motion, so the
  vendored dialog/sheet/dropdown enter-exit, the nav progress bar, the pulse skeletons,
  and the avatar hover comply by default instead of each needing a hand-written guard.
  The JS-driven picks lock keeps collapsing its own timing on top. file: `app.css` ·
  ADR-0029/0030
- **PR #570** `cut-release` backfills governance drift + squashes changelog window —
  the skill now runs the governance-freshness gate locally before computing the
  version (backfilling any missing changelog entries / stale ADR statuses it flags),
  and collapses the release's changelog window into one heading at cut time. Skill +
  doc change only.
