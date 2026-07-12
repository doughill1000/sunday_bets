# UI consistency audit — 2026-07-11

Full-surface audit of the shipped UI against the design guide ([`docs/DESIGN.md`](../DESIGN.md),
ADR-0030) and the token vocabulary ([`docs/agent-context/design-system.md`](../agent-context/design-system.md),
ADR-0029). The goal is a **baseline drift log** so the app stays consistent as it grows:
every screen was read against the 16 principles, the hard-constraint checklist, and the
pattern vocabulary, and the same jobs were compared across screens.

- **HEAD at audit time:** `ea0986d` (`docs: mobile-first design principles guide + ADR-0030`).
- **Method:** eight parallel subagent passes — one per surface (picks, stats,
  league+leaderboard, recap+wrapped+demo, group/settings/auth/join, admin, app shell +
  vendored `ui/`, plus a repo-wide mechanical sweep) — each grounded in DESIGN.md /
  design-system.md / `src/app.css` before reading every file in scope. The publicly
  reachable screens (`/demo` ×4, `/auth`, 404) were also rendered at 390 px / dark /
  `deviceScaleFactor: 2` with the design-study capture harness and eyeballed; authed
  screens couldn't be rendered in this environment (no local Supabase), so they are
  audited from code.
- **Severity:** **HIGH** = violates a hard constraint or breaks a principle with real
  user impact · **MED** = drift from an established pattern/token · **LOW** = polish.
  Per Doug's ask, everything is logged, including judgment-call nitpicks.
- **This is a log, not a fix pass.** Nothing was changed. A suggested remediation order
  is at the end.

> **Remediation status — updated 2026-07-12.** This report is a point-in-time snapshot at
> `ea0986d`; its findings are left as written. Progress against the
> [remediation order](#suggested-remediation-order) is tracked here so the log stays honest
> without rewriting the snapshot:
>
> - ✅ **Step 3 (partial) — `/stats` nested accordion flattened** (#538 / #539). The "No
>   disclosure nested inside a disclosure" scorecard **FAIL** is cleared; the breakdowns now
>   switch cuts with the chip radiogroup. `ui/accordion` is now at **0 consumers** (deletable
>   alongside `ui/navigation-menu` and `ui/radio-group`).
> - ✅ **Step 5 (partial) — `<ChipRadiogroup>` extracted** (#538 / #539), consumed by the
>   situational explorer and both `/stats` breakdown groups; the Tabs-vs-chips rule is
>   recorded in DESIGN.md. Still open: migrating the leaderboard/group/wrapped Tabs and the
>   degraded `FeedbackWidget` copy onto it.
> - ✅ **Step 7 (partial) — focus ring:** the extracted `ChipRadiogroup` was aligned to the
>   canonical `focus-visible:ring-[3px] ring-ring/50` recipe (now documented in
>   design-system.md). The other ~14 hand-written focus sites (native selects, avatar
>   buttons, dialog/sheet close) remain.
> - ✅ **Governance / docs:** ADR-0030 marked **Accepted**; DESIGN.md amended from this audit
>   (Tabs-vs-chips boundary, feedback ladder, ember positive spec + Known exceptions,
>   canonical focus ring, pattern-vocabulary rows).
>
> **Tracked issues (filed 2026-07-12).** The systemic backlog is now on GitHub:
>
> - **Wave 0 (hard-constraint clearers + the never-rendered warning):** #540 reduced-motion
>   (S2, step 1) · #541 focus-ring standardization (S3, step 7) · #542 render picks
>   `saveError` (S4, HIGH).
> - **Wave 1 (systemic mediums):** #543 elevation + motion tokens (S1, step 2) · #544
>   stale/error resilience (S5, step 4) · #545 feedback primitive + Toaster (S4, step 6) ·
>   #546 finish `ChipRadiogroup` + delete dead controls (S7, steps 3+5) · #547 P13
>   accent/status cleanup (S6, step 10) · #548 flash modals → Dialog (S8).
>
> **Not yet filed** — steps 9 (type-ramp + page-gutter migration), 11 (admin pass), 12 (demo
> snapshot refresh — use the `refresh-demo-snapshot` skill), 13 (guard hardening, S9), 14
> (LOW backlog), **and the per-surface HIGHs** that sit outside the systemic buckets: staged
> picks lost on reload (`/picks` P9), the expired-reset-link dead end, `FeedbackWidget`
> discarding typed text on dismiss, the `auth/error` dev-copy page, and admin File-to-GitHub
> double-filing. These want their own issues before implementation.

## Executive summary

The app's **interaction design is largely healthy** — the guide's flagship patterns are
real: the chip radiogroup ships with its full accessibility contract on `/stats` and
`/league`, the picks selection-tier ladder is implemented to the letter, answer-first
ordering holds on the data surfaces, empty states speak one copy voice, and the #528
leaderboard clip fix is robust. Color-token discipline is essentially perfect — the
brand-color guard has zero violations and zero escape-hatch uses.

The drift is concentrated in four systemic gaps, all cheaper to fix now than after ten
more surfaces ship:

1. **The ADR-0029 semantic token layer is 0 %-adopted outside color.** `text-stat` /
   `text-title` / `text-eyebrow`, the `gutter/section/stack/inline` spacing tokens,
   `shadow-elevation-*`, and the motion duration/easing tokens have **zero consumers**
   in `src/`. ~43 hand-rolled type recipes, ~19 raw shadows, and ~30 hardcoded
   animations are doing those tokens' jobs by hand, each slightly differently.
2. **Three hard-constraint items fail app-wide today:** the `/stats` nested accordion
   (the guide's own named anti-pattern, still shipping), reduced-motion support
   (2 of ~25 animating sites guarded, no global fallback), and visible-focus
   consistency (7 focus-ring recipes, 2 interactive sites with **no** focus indicator).
3. **Feedback/state machinery is three parallel systems.** 14 toasts, 7 copy-pasted
   group-page banners, 5 copy-pasted admin `note()` banners — with exactly **one**
   `aria-live` region in the whole app, several consequential actions whose only signal
   vanishes (or never renders at all — the picks partial-apply warning is computed,
   unit-tested, and displayed nowhere), and no stale/offline indicator despite the
   ADR-0017 cache serving stale data by design.
4. **The accent/status boundary (principle 13) leaks in both directions.** Brass
   carries "good/covered/hot" on `/league` and the demo; ember decorates a persistent
   demo nav CTA and the error-page kicker; the routine CoverMeter fill spends ember on
   every accuracy bar. Meanwhile the actual signature surfaces (Wrapped/recap) spend
   **no** theatrical budget at all.

One surprise from the screenshots: the public demo's Wrapped prose reads **"You didn't
just win Sunday Bets…"** — the demo league in the frozen snapshot is named after the
app's pre-rebrand identity, which a visitor will read as the product's name.

## Hard-constraint scorecard (app-wide)

| Checklist item                                       | Status                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nothing clips horizontally at 390 px                 | **Mostly pass** — 3 real risks: admin filed-issue URLs, WrappedCard name values (visibly wraps/overflows), PicksSummaryBar row                         |
| No disclosure nested inside a disclosure             | **FAIL** — `/stats` "More breakdowns" is an Accordion inside an Accordion, twice                                                                       |
| "Switch a cut" uses the chip radiogroup              | **Drift** — Tabs (styled to look like chips) do the same job on leaderboard/group/wrapped; undocumented exception                                      |
| Colours/type/spacing from tokens                     | **Color: pass** (guard clean) · **type/spacing/elevation/motion: fail** (0 % adoption)                                                                 |
| Primary action dominant; committed state clear       | **Pass on picks** (exemplary) · gaps: admin pending≡disabled, avatar save never reverts, group switcher silent failure                                 |
| Loading/empty/error/stale states designed            | **Empty: pass** · loading: one recipe + 2 outliers · **error/stale: fail** (isError drops good data; stale indicator absent)                           |
| Consequential actions: immediate + durable signal    | **Mixed** — picks lock exemplary; auth/reset/unlock/feedback are toast-only; picks partial-apply warning never renders                                 |
| AA contrast; visible focus; semantic roles; keyboard | **Mixed** — 2 AA breaches (opacity-stacking, destructive-as-text); 7 focus recipes incl. none; 2 hand-rolled modals; account menu likely keyboard-dead |
| Motion respects reduced-motion + tokens              | **FAIL** — only the picks lock flow complies; NavProgress runs a 2 s animation on every navigation unguarded                                           |

## Systemic findings

### S1 · The semantic token layer is dead vocabulary (MED, highest leverage)

Adoption measured by the sweep: `text-stat` 0 uses vs 22 hand-rolled big numerals
(mixed `text-2xl`/`text-3xl font-bold` for the same job); `text-eyebrow` 0 vs 21
all-caps kickers in **8 different recipes** (most `text-[10px]`/`text-[11px]` sites are
the 11 px token by another name); `text-title` 0 vs `text-xl font-bold` card headings
everywhere; page `h1` split between two recipes (`text-3xl font-bold tracking-tight` ×8
vs `text-2xl font-bold` ×11); spacing tokens 0 uses (`space-y-6` ×~15 doing
`gap-section`'s job, and wrapped/recap drifting to `space-y-8`/`space-y-4`);
`shadow-elevation-*` 0 uses vs ~19 raw shadows — including the vendored layer, where a
**dropdown sub-menu carries a heavier shadow than a modal** (`shadow-lg` vs the
dialog's `shadow-lg`, dropdown `shadow-md`), inverting the documented
elevation-tracks-the-stack rule; motion tokens 0 uses vs ~30 animated sites, and the
one sanctioned helper (`$lib/ui/motion.ts`, `LOCK_MOTION_MS = 180`) matches **neither**
`--duration-fast` (150) nor `--duration-base` (200) and carries a pre-ADR-0029 comment
claiming no repo-wide motion system exists.

**Fix shape:** mechanical migrations, one axis per PR — (a) wire the vendored bases
once (`ui/card` → `shadow-elevation-card`, dialog/sheet → `overlay`,
dropdown/popover → `popover`), which flips elevation adoption to ~90 % at the root and
makes the six redundant `Card class="shadow-sm"` call sites deletable; (b) swap the 21
kickers → `text-eyebrow`, 22 numerals → `text-stat`, card headings → `text-title`;
(c) pick one h1 recipe (suggest `text-3xl font-bold tracking-tight`, the data-surface
majority); (d) `space-y-6` → `gap-section`/`space-y-section` on page containers and the
layout `p-4` → `p-gutter`; (e) snap `LOCK_MOTION_MS` to a token and refresh its comment.

### S2 · Reduced motion is a hard constraint with 2 compliant sites (HIGH)

`prefers-reduced-motion` is honored only by the picks lock flow. Unguarded: the
`NavProgress` 2 s keyframe animation on **every navigation**
(`src/lib/components/app-header/NavProgress.svelte:10-27`), all 22 `animate-pulse`
skeletons, every vendored dialog/sheet/dropdown enter/exit animation, and
`hover:scale-110` on the avatar picker. **Fix shape:** one global rule in `app.css`
(`@media (prefers-reduced-motion: reduce)` zeroing animation/transition durations)
covers the vendored layer without hand-editing it; keep the existing JS collapse for
the picks flow.

### S3 · Focus treatment: 7 recipes for 1 job, including "none" (HIGH)

Variants found: vendored `focus-visible:ring-[3px] ring-ring/50 + border-ring`
(canonical); `ring-2 ring-ring` ±`ring-offset-2`; `ring-1`; an off-token
`ring-primary/50` (`WeightSelect.svelte:124`); `focus:` instead of `focus-visible:` on
the three native-select copies (`league/+page.svelte:90`, `stats/+page.svelte:82`,
`SeasonPicker.svelte:24`); and `focus:outline-none` with **no replacement ring** on the
12 settings avatar buttons (`settings/+page.svelte:357,370`) — keyboard focus is
invisible there. Native buttons on the picks card (Clear pick, Unlock) fall back to the
UA default outline. **Fix shape:** document one recipe (suggest the vendored
`ring-[3px] ring-ring/50`) in design-system.md, then align the ~15 hand-written sites;
the avatar picker also needs radiogroup semantics (it's a select-exactly-one job with
no `role`/`aria-checked` today).

### S4 · Feedback machinery: 3 systems, 12 copies, 1 `aria-live` (HIGH)

- The **picks lock flow is the house pattern done right** (optimistic staging, in-flight
  label, durable committed row, inline `aria-live` error) — and it hosts the app's
  _only_ `aria-live` region.
- **Never-rendered warning:** `picks.ts:104-122` computes
  `saveError = "Saved — couldn't apply to N groups"` on partial apply (unit-tested!)
  but no component consumes `saveError` once the card leaves the board — a multi-group
  member gets zero signal (HIGH).
- **Toast-only consequential feedback:** auth sign-in/up/reset failures
  (`auth/+page.svelte:144-151`, `reset/+page.svelte:36-40`), unlock failure
  (`LockedPicksSection.svelte:66-69` — "Unlock failed", no cause, no retry), feedback
  submit success. Password-reset success silently redirects to `/picks` with no
  confirmation at all (`reset/+page.server.ts:54`).
- **12 hand-rolled banners, none announced:** the same `{kind, text}` status div is
  re-declared 7× in `group/+page.svelte` and a `note()` helper is copy-pasted into 5
  admin cards; all distinguish success/error by border color only, no
  `role="status"`/`aria-live`, no icon.
- **Admin's shared banner renders below all six action cards** — off-screen at the
  moment of action, overwritten by each next action, nothing durable ("last synced at"
  doesn't exist) (`admin/+page.svelte:69`).
- The stock **Toaster renders over the bottom tab bar on mobile** (no `mobileOffset`,
  no `closeButton`), covering primary nav exactly when the user has just acted.

**Fix shape:** extract one `<FormNote kind=…>` primitive (icon + semantic text color +
`role="status"`/`alert`) and one inline-confirmation convention; render `saveError`;
move auth errors inline; configure the Toaster (offset above tab bar, closeButton,
`theme="dark"` — it currently reads `mode-watcher` with no `ModeWatcher` mounted in a
hardcoded-dark app).

### S5 · Stale/error resilience contradicts ADR-0017 (HIGH)

The client cache exists precisely to show last-good data, but every TanStack surface
checks `isError` **before** `data`: on a background-refetch failure (offline PWA
revisit is the guide's own example) leaderboard, `/league`, and `/stats` all swap a
fully populated screen for the dashed "Couldn't load…" card
(`leaderboard/+page.svelte:167,282`, `league/+page.svelte:695,735`,
`stats/+page.svelte:328-331` — TanStack v5 keeps `data` when a refetch errors). There
is additionally **no stale/offline indicator anywhere in the shell**, no retry buttons
(error copy says "refresh the page"), `/stats`' streamed `{#await}` has no `{:catch}`
(a rejected promise leaves a permanent fake loading card,
`stats/+page.svelte:416-421`), and a season switch on `/stats` replaces the whole
layout — including the sticky context bar the user just touched — with anonymous pulse
blocks (no `placeholderData: keepPreviousData`). **Fix shape:** gate error cards on
`isError && !data`; render data + a small stale pill + retry when data exists; one
shell-level offline/stale indicator driven by `onlineManager`/`dataUpdatedAt` so every
screen inherits it.

### S6 · Accent vs status vs signature (P13) leaks both ways (MED)

- Brass-as-"good": `TeamGameLog.svelte:44` and `HotCold.svelte:41` use the default
  (brass) Badge for covered/hot opposite a red "bad", and the demo board's won pick
  does the same (`DemoPicksBoard.svelte:137`, visually confirmed) — while
  `WeeklyPickCard` and `/stats` correctly use the success/destructive axis for the
  identical job. Fix: add a `success` Badge variant and keep brass off the good/bad axis.
- Brass-as-status: locked state is `text-primary` "🔒 Locked" on the committed row but a
  `secondary` Badge on GameCard — one status, two treatments, one of them the accent.
- Ember leaks: the demo's persistent nav CTA (`DemoSignupCta.svelte:24`), the 404
  page's "ERROR 404" kicker (`+error.svelte:46` — errors belong to the destructive
  axis), and every routine CoverMeter fill (`CoverMeter.svelte:34`,
  `from-ember to-primary`) spend the reserved accent on furniture.
- Meanwhile Wrapped/recap — the named signature surfaces — use **no** ember and none of
  the slow/deliberate motion tokens; the champion card is visually identical to the
  "Players" count tile. The celebration peak currently has less presence than the
  demo's sign-up button. Either spend the budget there (a reduced-motion-guarded
  champion reveal is the obvious candidate) or record the restraint deliberately.
- Each ember exception that should survive (CoverMeter? demo CTA?) belongs in
  DESIGN.md's "Known exceptions" — today that section says "none yet" while the
  exceptions ship.

### S7 · Two controls own "switch a cut"; the canonical one is triplicated (MED)

Tabs — restyled via `ACTIVE_TAB_TRIGGER_CLASS` to _look_ like the chip radiogroup — do
the chip's job on leaderboard (Standings/Weekly/All-time), group (League/Manage), and
wrapped (Your Year/The League). DESIGN.md's pattern table sanctions only the chip
radiogroup and records no exception. Meanwhile the chip implementation itself is
pasted verbatim in `SituationalExplorer.svelte` and `league/+page.svelte` (with the
overflow-fade cue only on the league copy) and a third, degraded copy in
`FeedbackWidget.svelte:100-114` declares radio roles but has **no roving tabindex, no
arrow keys, no focus ring** — breaking the worked example's accessibility contract.
Also on leaderboard the time-window job is split across two controls (seasons in the
SeasonPicker dropdown, All-time as a tab), where #518/#529 established pinning the
career/pooled window into the dropdown. **Fix shape:** extract one `<ChipRadiogroup>`
component (roving tabindex + fade cue) consumed by all three sites; then either migrate
the three Tabs uses or write the "when Tabs, when chips" rule into DESIGN.md as a
recorded exception; fold All-time into the season dropdown.

### S8 · Overlay discipline: two hand-rolled modals and an inverted stack (HIGH)

`RecapFlash.svelte:37-57` and `WrappedFlash.svelte:34-45` are hand-rolled
`fixed inset-0` overlays with suppressed a11y warnings — no `role="dialog"`, no
`aria-modal`, no focus trap, no Escape; WrappedFlash contains the fully interactive
WrappedStory including an AwardsGuide trigger that opens a _second_ overlay at the same
`z-50`, and it double-renders the exact screen the user is already on when mounted at
`/wrapped`. The vendored Dialog/Sheet (used correctly by AwardsGuide/WelcomeGuide with
the desktop-dialog/mobile-bottom-sheet split) fixes all of it, plus the scrim drift
(`bg-black/40` vs vendored `/50`). Related: the vendored dialog is `max-w-lg` with no
viewport margin (edge-to-edge at 390 px; upstream now ships `max-w-[calc(100%-2rem)]`),
and Wrapped's seen-state is per-device localStorage while RecapFlash deliberately
migrated to a server-side marker (#302) — same job, two mechanisms.

### S9 · The brand-color guard's blind spots are where the drift lives (LOW)

The guard is working (0 violations, 0 allowlist uses) but: it scans only `.svelte`
(all 84 remaining raw hex live in `.ts` — currently the two documented dynamic sources,
but nothing would catch a third), and its scale regex requires a numeric step so
`text-white` passes — and is in use on the `/stats` record numerals
(`stats/+page.svelte:280`, `CareerSummary.svelte:46`): pure white on a warm-cream
palette, not theme-flippable. **Fix shape:** `text-foreground` at the two sites; add
bare `white|black` to the guard regex; extend the scan to `src/lib/**/*.ts` with the
existing allowlist.

## Findings by surface

Dedup note: items covered by S1–S9 above aren't repeated; what follows is
surface-specific.

### /picks

- **[HIGH]** P9 — staged (uncommitted) selections live only in memory; a reload/PWA
  relaunch discards them and `seedPicks()` silently re-stages the **spread favorite**,
  so a user who staged the underdog returns to the opposite team pre-selected with no
  cue (`picks.ts:17-22`, `PicksBoard.svelte:66-77`). Persist staged picks (storage
  keyed by week+game) or visually distinguish auto-seeded from user-staged.
- **[HIGH]** P10 — partial-apply `saveError` never rendered (see S4).
- **[MED]** Two disclosure anatomies on one screen: `<details>/<summary>` + rotating
  triangle (committed section) vs button + `aria-expanded` + chevron (roster)
  (`LockedPicksSection.svelte:83-94` vs `PicksStatusBoard.svelte:54-78`). Standardize.
- **[MED]** Weight group has no accessible name — `Label for=` targets the ToggleGroup
  `<div>`, which isn't labelable (`WeightSelect.svelte:108-117`); use `aria-labelledby`.
- **[MED]** The disabled comments Post button is dimmed brass
  (`CommentsSection.svelte:236-244`) — exactly the "kind of active" look the
  selection-tier rules forbid; use the flat/muted disabled treatment.
- **[MED]** `PicksSummaryBar.svelte:51-81` detail row has no `flex-wrap`; All-In +
  missed + four weight counts force mid-phrase wrapping at 390 px.
- **[LOW]** Unreachable states in `GameCard.svelte:52-67,107-109` (locked games are
  filtered from `upcoming`; the badge shows only during the 180 ms exit) and its badge
  renders "@ H" where H means weight High but reads as "at home"; raw weight codes
  (`· M`, `A 1`) appear on durable rows while chips spell "Medium 3" — use
  `weightLabel()` everywhere durable.
- **[LOW]** Emoji doing functional-icon work (🔒 ⏱ 📋 🐳 ✕) mixed with SVG chevrons;
  `aria-controls` pointing at a non-rendered id (`PicksStatusBoard.svelte:58,86-87`);
  `rounded-2xl` one-off on the app's most repeated card; status board / All-In board
  hand-roll `rounded-lg border bg-card` instead of `Card`.

### /stats (the flagship — mostly exemplary, but hosts the one named anti-pattern)

- **[HIGH]** Nested accordion ×2 (S2 of the guide's checklist; see scorecard) —
  `stats/+page.svelte:459-511, 621-686`. Flatten; this also frees the accordion
  component for removal.
- **[HIGH]** `{#await data.allTimeDetail}` has no `{:catch}` (permanent fake loading
  card on rejection) — `stats/+page.svelte:416-421`.
- **[HIGH]** AA breach: thin buckets apply `opacity-60` to the whole row, stacking on
  `text-muted-foreground` for the 10 px "needs N more" line → ≈3.2:1 on card
  (`SituationalExplorer.svelte:146,184-187`). Dim the bar, not the explanatory text.
- **[MED]** `text-destructive` as small text on card ≈4.25:1 — below AA for the delta
  labels (`SituationalExplorer.svelte:150-159`, `YourEdge.svelte:73-79`); consider a
  lighter text variant of the destructive token.
- **[MED]** H2H copy says "games **you** disagreed on" even when viewing another player
  (`stats/+page.svelte:293-304`); reuse the `subject` helpers.
- **[LOW]** "missed" appears twice in the season snapshot (caption + tile); pushes
  suppressed-when-0 in edge/explorer but always `-0` in snapshot/lists — one record
  grammar; `rounded-[5px]`/`rounded-[3px]` where `rounded-md/sm` are within a pixel;
  skeleton is `aria-hidden` with no SR "Loading stats" announcement; trend chart
  labelled "…for each player" in single-player use with no text alternative.

### /league + /leaderboard

- **[MED]** No sticky context bar: the scope select and "Slice by" chips scroll away
  above a 32-row team list while `/stats` pins the same job (`league/+page.svelte:607-687`).
- **[MED]** Weekly panel loading is a bare `<p>Loading…</p>` and every week switch
  routes through a full `invalidateAll` (`leaderboard/+page.svelte:275`).
- **[MED]** League team list (`ul` + CSS grid) loses header↔cell association for
  screen readers — add sr-only per-value labels like HotCold's "Last 4:" prefix
  (`league/+page.svelte:430-486`); its sort buttons re-implement `SortableTableHead`
  minus `aria-sort`.
- **[MED]** `WeeklyPickCard` outcome is tint-only (no Cover/No cover/Push text badge,
  and the spread isn't shown so the outcome can't be derived from the score)
  (`WeeklyPickCard.svelte:56-67`).
- **[LOW]** Screenshot observation: at 390 px the demo standings truncate "Beth (you)"
  to "Be…" and "Charlie" to "Ch…" while Rec/Total keep visible slack — the truncation
  works but over-fires; consider letting the name column take the slack before
  ellipsizing. 🏆 rank-1 span needs `role="img"`; truncated names lack `title` (league
  rows have it); vendored `<th>` lacks `scope="col"`; SpreadBuckets explains thin
  samples only via `title` tooltips (invisible on touch) while Primetime/Divisional use
  a visible footnote; MarketBends favorites series uses `bg-primary` instead of
  `chart-1`; hand-rolled SVG chevron/check in WeeklyPicksBreakdown where lucide is the
  house set; scope select labelled "Season" though it holds "Last 5 · pooled".

### /recap + /wrapped + /demo

- **[HIGH]** Hand-rolled flash modals (S8) and WrappedCard 390 px overflow — the
  screenshot shows "36-17-2" wrapping mid-record inside the tile; name-valued cards
  (Champion/Nemesis) overflow outright (`WrappedCard.svelte:24`). Truncate + `title`,
  or smaller type for name values.
- **[MED]** Public demo copy: "You didn't just win **Sunday Bets**" (snapshot group
  name = pre-rebrand app name — rename the demo league in the seed and regenerate the
  snapshot); "Regenerate the demo snapshot to populate Season Wrapped." is developer
  copy on a public page (`demo/wrapped/+page.svelte:42`).
- **[MED]** `/recap` is orphaned in the authed app (only a push-notification URL leads
  there) while the demo promotes Recap to a permanent tab — the demo sells a
  destination a converted user can't find. Also only the newest 5 recaps render, with
  no week navigation.
- **[MED]** `DemoPicksBoard.svelte:76` hides all pickable sides from screen readers via
  `aria-hidden="true"`; `DemoStandingsTable` is an admitted hand-copied fork of the
  leaderboard markup (will silently desync); recap's empty state is a bare `<p>` while
  wrapped's is the designed dashed card.
- **[LOW]** Recap h1 (`text-xl font-semibold`) and doubled gutter (`px-4` inside the
  layout's `p-4`) drift from every sibling; demo tab labels 10 px vs authed 11 px;
  Wrapped standings name span lacks `min-w-0`/truncate; rank formatted three ways
  (`#4`, `4.`, bare); no share/export exists on the surfaces built for the group chat —
  a product gap worth an issue.

### group / settings / auth / join / feedback widget

- **[HIGH]** Expired reset links land on `/auth?reset=expired` which the page never
  reads — silent dead end (`auth/reset/+page.server.ts:17`).
- **[HIGH]** FeedbackWidget destroys up to 4 000 typed chars on any accidental sheet
  dismiss (`FeedbackWidget.svelte:41-44` resets on close).
- **[HIGH]** `auth/error` page: developer copy ("check your Supabase settings"),
  ignores the `reason` param six routes send (`?reason=no-group`), and its `class="card"`
  resolves to nothing (renders unstyled).
- **[MED]** Avatar save is optimistic with no revert on failure
  (`settings/+page.svelte:79-90`); "Disconnect" sign-in method has no confirm while
  less-consequential actions do; copy-invite-link gives zero feedback and swallows
  clipboard failure (`group/+page.svelte:275-278`); "Skip for now" in WelcomeGuide
  permanently dismisses (same handler as "Got it").
- **[MED]** Three card grammars coexist: default Card anatomy (LeagueHonors),
  `Card class="p-6"` + zeroed header/content padding (settings ×4, group ×7, join —
  the dominant dialect, fighting the component's own defaults), and the auth glass card
  (`rounded-2xl bg-card/90 shadow-2xl backdrop-blur-xl`). Adjust the vendored defaults
  once instead of per-callsite.
- **[MED]** Destructive actions have four grammars: destructive+confirm (leave group),
  outline-sm+confirm (remove member/revoke), outline+no-confirm (disconnect), and
  plain link to a state-changing **GET** (sign out ×3). One confirm dialog + POST
  sign-out.
- **[LOW]** `switchMode` clears the typed email; join error box drops
  `text-destructive` that join/[code] has; "Back to Sign in"/"Back to sign in"/"Back to
  Login" three casings; feedback textarea named only by placeholder, no char counter;
  `/join/pending` shows roadmap copy to a stuck user with no refresh affordance;
  `{window?.location?.origin}` in group markup is SSR-fragile.

### admin (desktop-first is sanctioned; tokens/states/a11y still apply)

- **[HIGH]** File-to-GitHub has no pending state and a check-then-act server guard — a
  double tap can file duplicate public issues (`admin/feedback/+page.svelte:198`);
  status-action failures return `fail()` without the `id` the banner is keyed on, so
  failed Mark-triaged/Dismiss renders nothing (`+page.server.ts:57-68`); filed-issue
  URLs render unbroken and clip 390 px (`+page.svelte:160,174,190`); the shared result
  banner sits below all six cards (S4).
- **[MED]** Pending ≡ unavailable visually on every admin button (the codified
  `.lock-btn.saving` distinction isn't applied); `AdminCard` shell used by 2 of 6 cards
  (the rest hand-roll it and GameplaySettings has drifted); gameplay toggle is a plain
  Button whose label _is_ the state — no `role="switch"`/`aria-checked`; AddMember uses
  raw inputs outside a `<form>`; cron error cell is `truncate` with no way to read the
  one string that explains the failure; feedback load failure throws a bare `Error`
  (generic 500 page); no `h1` on the admin index; opacity-as-muted
  (`opacity-60/70/80/85`) instead of `text-muted-foreground` across OddsSync/AddMember.
- **[LOW]** Card-title conventions mixed ("Admin • X" ×5 vs unprefixed ×3, mixed
  casing); "(issue #500)" tracker refs in UI copy; headroom _caution_ colored
  `text-destructive` instead of `text-warning`; one shared `grading` flag makes all
  three grading buttons say "Working…" at once; kind emoji not `aria-hidden`.

### App shell + vendored `ui/`

- **[MED]** Bottom tab bar active state is `text-primary` **only** — color-only, and
  the same brass that means "actionable" elsewhere (P5's four meanings); add a shape
  cue (`BottomTabBar.svelte:32-34`).
- **[MED]** Account-menu links are `<a>` nested _inside_ `DropdownMenuItem` instead of
  rendered via the `child` snippet — keyboard activation likely fires on the item, not
  the anchor, making Settings/Admin/Sign out unreachable by keyboard
  (`HeaderAccount.svelte:75-95`; verify + fix with the GroupSwitcher pattern).
- **[LOW]** GroupSwitcher has no pending state and ignores errors (failed switch still
  `invalidateAll()`s); no skip link (desktop keyboard users tab through ~9 controls per
  page); feedback FAB overlaps the engagement banner's dismiss X at `bottom-20`;
  NavProgress freezes at 88 % and uses off-scale `z-[100]`; dead vendored components —
  `ui/navigation-menu` (9 files, 0 consumers), `ui/radio-group` (0 — the app's
  radiogroups are hand-rolled chips), `ui/toggle` (internal only), and `ui/accordion`
  is one /stats fix from 0. Remove them so the wrong control can't be reached for.

## Drift map — same job, different answers

| Job                      | Implementations found                                                                                                               | Canonical candidate                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Switch a cut of one data | Chip radiogroup (stats, league, feedback-degraded) **and** restyled Tabs (leaderboard, group, wrapped, demo ×2)                     | `<ChipRadiogroup>` + a recorded Tabs rule    |
| Reveal secondary detail  | Accordion (stats, nested), `<details>` (picks, grading), button+`aria-expanded` (league, picks), hand-rolled modal (flashes)        | One expandable-row anatomy + vendored Dialog |
| Confirm destructive act  | `confirm()` (group ×3, grading ×3), no confirm (disconnect, file-to-GitHub), inline anchored panel (All-In)                         | Inline panel (picks) or one small dialog     |
| Tell the user it worked  | Durable state change (picks), inline banner ×12 (group/admin, unannounced), toast-only (auth/unlock/feedback), silent redirect (×4) | Durable-first + `<FormNote role="status">`   |
| Big numeral              | `text-2xl font-bold` ×~12, `text-3xl font-bold` ×~10                                                                                | `text-stat`                                  |
| Section kicker           | 8 recipes across 21 sites                                                                                                           | `text-eyebrow`                               |
| Page h1                  | `text-3xl font-bold tracking-tight` ×8, `text-2xl font-bold` ×11, `text-xl` ×1 (recap), CardTitle-as-h1 (auth)                      | One recipe, ideally tokenized                |
| Page gutter              | 1 rem (layout only), 2 rem (settings/admin/recap), 2.5 rem (join)                                                                   | `p-gutter`, page adds nothing                |
| Locked status            | `text-primary` 🔒 text (committed row), `secondary` Badge (GameCard)                                                                | One non-accent treatment                     |
| Win/positive             | `--success` (WeeklyPickCard, stats), brass Badge (TeamGameLog, HotCold, demo)                                                       | `success` Badge variant                      |
| Native select            | Identical ~200-char class string pasted in league/stats/SeasonPicker (+4 near-copies), `focus:` rings                               | One styled select atom                       |
| Skeleton                 | One pulse recipe hand-copied ×7 files + bare "Loading…" (leaderboard weekly)                                                        | `<Skeleton>` atom, `motion-reduce:` guarded  |
| Seen-once flash          | Server-side marker (RecapFlash) vs localStorage (WrappedFlash, WrappedPromo)                                                        | Server-side marker                           |

## What conforms well (keep doing this)

- **Chip radiogroup on /stats and /league** — the full worked-example contract,
  byte-identical markup, honest overflow fade (league). Extract, don't rewrite.
- **Picks selection ladder + lock flow** — the tier CSS matches the doc exactly;
  `disabled:opacity-100` deliberately defeats the shadcn dim so flat-disabled wins;
  saving stays ember; reduced motion collapses; it's unit-tested. This is the house
  standard the rest of the app should copy for pending-vs-unavailable and feedback.
- **Empty states** — one copy voice ("No X yet") in three coherent tiers app-wide.
- **#528 leaderboard clip fix** — `max-w-0` + truncate + responsive Rec collapse +
  double-contained scroll; mirrored faithfully in the demo.
- **`/join/[code]` terminal states**, the group page skeleton/error hierarchy, signup's
  durable "Check your email" view swap, form label/autocomplete discipline, universal
  busy-button discipline (~60 sites), and `+error.svelte` as a designed state.
- **Color-token discipline + the guard** — zero violations, zero escape hatches, tight
  allowlist.
- **Demo↔authed reuse** where it was done properly (RecapCard, WrappedStory,
  LeagueHonors, UserAvatar) — the demo is the real product, not a restyle.

## Suggested remediation order

Leverage-ranked; each line is roughly one focused PR.

1. **Global reduced-motion fallback in `app.css`** (S2) — one rule, clears a hard
   constraint app-wide.
2. **Wire elevation + motion tokens into the vendored bases** (S1) — Card/dialog/
   sheet/dropdown once; delete redundant per-callsite shadows.
3. **Flatten the /stats nested accordion** (scorecard FAIL); then delete
   `ui/accordion`, `ui/navigation-menu`, `ui/radio-group`.
4. **Fix `isError`-with-data on leaderboard/league/stats + add `{:catch}`** (S5); add
   the shell stale/offline pill.
5. **Extract `<ChipRadiogroup>`** (fixes FeedbackWidget's broken copy for free);
   record the Tabs-vs-chips rule in DESIGN.md (S7).
6. **Extract `<FormNote>`** with `role="status"`; render picks `saveError`; inline
   auth errors; configure the Toaster (S4).
7. **Focus-ring standardization + avatar-picker semantics** (S3); verify/fix the
   account-menu keyboard path.
8. **Rebuild RecapFlash/WrappedFlash on Dialog/Sheet** (S8); server-side Wrapped
   seen-state.
9. **Type-ramp migration** (`text-stat`/`text-title`/`text-eyebrow`, one h1 recipe)
   and page-gutter normalization (S1) — mechanical, big consistency payoff.
10. **P13 cleanup**: `success` Badge variant, one locked treatment, ember off the
    error page and (decide) the CoverMeter/demo CTA — record surviving exceptions in
    DESIGN.md.
11. **Admin pass**: File-to-GitHub pending+confirm, banner-per-card, AdminCard
    adoption, 390 px URL break.
12. **Demo snapshot refresh**: rename the "Sunday Bets" demo league, fix WrappedCard
    truncation, visitor-facing empty copy, de-fork DemoStandingsTable.
13. **Guard hardening** (S9): `white|black` in the regex, scan `src/lib/**/*.ts`.
14. Backlog of LOWs above as a checklist issue.

Process suggestions: add the drift-map table's "canonical candidate" column to
DESIGN.md's pattern vocabulary as rows get promoted; the hard-constraint checklist is
already in the PR template per DESIGN.md — this audit suggests it needs the reviewer to
actually run the 390 px capture for any layout-touching PR, since two of the three
390 px breaches shipped after the guide's example bug was fixed.

## Method appendix

- Subagent scopes: picks · stats · league+leaderboard · recap+wrapped+demo ·
  group/settings/auth/join/feedback · admin · shell+vendored ui · mechanical sweep
  (greps for color/motion/type/spacing/elevation/feedback/a11y/disclosure patterns).
  Every `.svelte` under `src/routes` and `src/lib/components` was read.
- Screenshots: throwaway design-study harness (390×844, DPR 2, dark) against `pnpm dev`
  with the committed demo snapshot; public surfaces only (`/demo`, `/demo/leaderboard`,
  `/demo/recap`, `/demo/wrapped`, `/auth`, 404). `/auth/reset` and `/join` redirect to
  `/auth` unauthenticated. Authed screens were not rendered (no Supabase creds in the
  audit environment) — their findings are code-derived; line numbers anchor to
  `ea0986d`.
- Single-source claims worth re-verifying during fixes are phrased as "likely" above
  (the HeaderAccount keyboard path chief among them). The picks `saveError` gap and the
  demo "Sunday Bets" prose were independently re-verified during synthesis.
