# Product audit — 2026-07-16

Graded every shipped product surface against [`docs/PRODUCT.md`](../PRODUCT.md) (ADR-0036,
Proposed) using the `product-audit` skill: one Explore subagent per surface, verdicts carried
verbatim, synthesis by the orchestrator.

- **HEAD at audit time:** `0b1f119` (master, clean tree) — includes the just-merged rubric
  (PR #685).
- **Lane reconciliation:** the skill's 11-surface map was reconciled against the current
  `src/routes/(app)/` route list — the old `/recap` route is graded inside the `/league` lane
  (it survives as a CTA-reached archive, not a duplicate), and **Onboarding (welcome modal +
  `/how-to-play`)** was added as a twelfth lane since it ships today but no listed surface
  covered it.
- **Meta note (not a lane):** `ROADMAP.md`'s release table is stale — it stops at v2.1 with
  "v1.9 Now" while the app is shipping v3.7. The strategic-timing lens was therefore grounded
  in the durable arc the roadmap documents (single-group → multi-group, measurement-gated
  infra) plus recent changelog reality (private-beta launch readiness + engagement polish).
  Worth refreshing the table so the next audit doesn't have to caveat it.

## Scorecard

| Surface                                   | Verdict     | One-line justification                                                                               |
| ----------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Picks board + All-In                      | **Keep**    | Core loop and loudest on-brand moment; only critique is density, not misfit                          |
| /league (standings + week + manage)       | **Keep**    | The heart surface — feeds the group chat, cheap matviews, timed dead-on to the arc                   |
| /market                                   | **Reshape** | Week slate earns its keep; the five-slice pooled ATS explorer is over-built for six casual friends   |
| /stats                                    | **Keep**    | On-brand, group-scoped, actively de-bloated; watch matview creep and explorer/strip overlap          |
| /wrapped                                  | **Keep**    | The rubric's own named signature moment, near-zero recurring cost                                    |
| Badges & weekly hardware                  | **Keep**    | A fun layer that already governs itself — the #634–#652 trim did the reshape work                    |
| Credibility rating                        | **Keep**    | Exemplary against the rubric — the reference example PRODUCT.md itself cites                         |
| Catch-up mechanics                        | **Keep**    | Canonical "recognition over equalization" — value earned by declining complexity                     |
| Notifications & preferences               | **Keep**    | The pull-back-to-the-app engine; only line-shift alerts over-assume seriousness                      |
| /demo                                     | **Keep**    | The one surface correctly built for strangers, structurally isolated; staleness is a maintenance gap |
| Feedback                                  | **Keep**    | Proportionate beta instrumentation; heaviest machinery justified by repo publicness, not scale       |
| Onboarding (welcome modal + /how-to-play) | **Keep**    | The current arc made concrete; the one known drift concern (#633) already fixed                      |

**Tally: 11 Keep / 1 Reshape / 0 Retire.**

## Executive summary — what's noise, what's drift

1. **The pruning discipline is working; the audit mostly certifies it.** The near-sweep of
   Keeps is not grade inflation — almost every lane found that its surface had _already_ been
   reshaped recently: `/league` re-contained (#631), badges cut 19→15 (ADR-0035 v2, #634–#652),
   `/stats` consolidated (#567/#575), catch-up resolved as a decision _not_ to build (ADR-0020),
   credibility rewritten smaller (v2, ADR-0032). The rubric's standards were being applied
   before the rubric existed.

2. **Density, not misfit, is the systemic risk.** Four independent lanes flagged the same
   failure mode: good surfaces accreting one more block. The picks screen stacks six elements
   (`PicksBoard.svelte` composition) and sits "at the upper bound of busy"; `/league`'s
   Standings tab stacks four (`StandingsTable` + race chart + `LeagueHonors` + `RatingLadder`);
   `/stats`' "Every split" explorer partly re-serves what `SignatureTells` already headlines;
   weekly hardware is up to 5 gongs/week. The working rule going forward: **a new engagement
   element displaces an existing one, it doesn't stack.**

3. **The analytics muscle overshoots the room in exactly two places.** This is the audit's
   "what's noise" answer: `/market`'s deep explorer (pooled 5-year Primetime/Divisional/Spread
   slices + per-team game logs, whose own copy keeps admitting "descriptive, not predictive")
   and the notifications line-movement alert with its per-user points-threshold knob
   (`detectLineShifts` in `src/lib/server/notifications.ts`) — a sportsbook control in a casual
   pick'em. Both have named, smaller on-brand forms.

4. **Guards verify shape, not freshness or config epoch.** Three lanes independently found the
   same gap class: the `/demo` drift-guard stays green while the demo season goes materially
   stale (#607, `demo-snapshot.test.ts` checks shape only); the onboarding copy rotted once
   with no guard (#633, since fixed by hand); the feedback "Beta" tag was supposed to be
   config-gated for the public epoch but is gated only on `{#if user}` (`AppHeader.svelte`).
   Cheap assertions would close all three.

5. **Recurring cost is well-bounded everywhere; the real tails are logic mirrors and matview
   count.** No lane found an unjustified cron or quota draw. The standing taxes are hand-synced
   duplicates that must never drift — `src/lib/domain/liveCover.ts` ↔ the SQL grading path,
   and the drop-worst predicate duplicated across 3 SQL views + `scoring.ts` — plus
   `refresh_leaderboard_stats()` now refreshing ~17 matviews on every grade run (a `season-ops`
   signal to watch, not a redesign).

## Prioritized recommendations

No lane produced a P0 or P1 — nothing shipped is unfair, broken, or urgently off-brand.

Each item carries a prescriptive **Execution** note: the model @ effort a Claude Code session
(or subagent) should run at, on the ladder Haiku → Sonnet → Opus → Fable / low → xhigh.
The rule behind the assignments: **taste and product judgment escalate the model; ambiguity
escalates the effort; mechanical diffs get neither.**

**P2**

1. **Reshape /market to its lean form** (#692, v3.9) — keep `WeekSlate` (the pre-pick companion), the
   By-team ATS records, and the single `MarketBends` synthesis as the honest lead; retire the
   pooled 5-year scope and the Primetime/Divisional/Spread drill-in slices + per-team game
   logs, folding any genuinely conversational nugget back into the week slate.
   — `src/routes/(app)/market/+page.svelte`, `leagueSlices.ts`, `MarketBends.svelte`
   **Execution: Opus @ high.** The hardest task on the list: deletion-heavy (~700-line page +
   ~8 components) but taste-laden — deciding which nuggets survive into the week slate is
   product judgment, and the surviving page must still clear `DESIGN.md` at 390px. Run a quick
   `design-study` first at the same tier; do not hand this to Sonnet.
2. **Trim line-movement alerts** (#693, v3.8) — drop the per-user threshold knob (fire on one sensible
   fixed move) or retire the alert entirely and fold "your line moved" into the existing
   pick-reminder nudge. — `detectLineShifts` in `src/lib/server/notifications.ts`, `/settings`
   Notifications card
   **Execution: Sonnet @ medium.** Clear spec, small mostly-subtractive diff; the only care
   point is the prefs column/migration if the knob is dropped (use the `db-migration` skill).
   The one judgment call — drop vs fold — should be settled in the issue, not left to the
   implementing session.
3. **Give the /demo drift-guard an editorial-freshness signal** (#694, v3.8) so it can't stay green while
   the demo season is stale (assert `completedSeasonYear` within N of the live season; warn on
   `meta.generatedAt` age) — this is the concrete close for #607's blind spot.
   — `src/lib/server/demo/__tests__/demo-snapshot.test.ts`
   **Execution: Sonnet @ low.** A handful of assertions in an existing test file. Fix the
   thresholds in the issue (e.g. demo season within 2 years of live; warn past 90 days) so the
   session has zero product decisions to make.
4. **Adopt the displacement rule on the dense surfaces** (#695, v3.8) — before the next engagement addition
   to the picks screen or the /league Standings tab, name what it replaces.
   — `src/lib/components/picks/PicksBoard.svelte`, `src/routes/(app)/league/+page.svelte`
   **Execution: Fable @ medium, inline — not farmed out.** This is a one-paragraph rubric edit
   (a "displacement" tenet in `docs/PRODUCT.md`, possibly mirrored in `DESIGN.md`); the wording
   _is_ the work, so it belongs in a top-tier interactive session, not a subagent.
5. **(Optional polish) Give the Wrapped champion reveal an actual moment** (#696, v3.9) — it's currently a
   plain 🏆 stat card; earn the ember here rather than expanding the surface.
   — `WrappedStory.svelte`
   **Execution: split.** The design study (how much ember, what staging) is the taste call —
   Opus or Fable @ high via `design-study`. The build afterward is one component's staging and
   motion — Sonnet @ high (high because signature-moment restraint has to survive
   implementation, per ADR-0023's precedent).

**P3**

6. **Config-gate the feedback "Beta" tag** (#697, v3.8) so it flips off in one change at the public epoch,
   as the ADR-0028 follow-up intended. — `AppHeader.svelte`
   **Execution: Haiku @ low** (or fold into any passing PR). Mechanical: introduce one config
   flag and gate an existing element on it; the instructions fully determine the diff.
7. **Add a lightweight onboarding copy drift-guard** (#698, v3.8) (fixture/snapshot tying the copy's feature
   list to the nav/awards catalog) so `HowToPlay.svelte` can't silently rot again the way #633
   did. — `src/lib/components/howto/HowToPlay.svelte`
   **Execution: Sonnet @ medium.** Small test, but designing a snapshot signal that catches
   real copy rot without going flaky (what exactly ties copy to the nav/awards catalogs?)
   takes some thought — above Haiku, below Opus.
8. **Watch items (no action today):** `/stats` matview creep (~17 on the grade path) and the
   "Every split" vs `SignatureTells` overlap; weekly-hardware gong count vs the curated season
   titles; the compressed ±35-pt rating spread; the `liveCover.ts` ↔ SQL and drop-worst
   predicate mirrors as hard parity gates on any grading edit; refresh `ROADMAP.md`'s release
   table (see meta note above).
   **Execution:** the watch items need no session at all — they're `season-ops` / next-audit
   inputs. The `ROADMAP.md` table refresh is a docs edit, but it restates strategy — do it
   inline in a Fable/Opus session (@ low), not via a farmed-out agent.

---

## Per-surface grade blocks

### Picks board + All-In — Verdict: Keep

**Justification:** It is the app's core loop and its loudest on-brand moment; every lens passes and the two fairness-sensitive additions (All-In reveal, live sweat board) each shipped behind an ADR-scoped boundary — the only real critique is density, not misfit.

**Lens read:**

- Value vs noise: Earns its complexity, but this is the most-accreted screen in the app — one surface now stacks the pick board, `PicksSummaryBar` (saved counter + All-In line + weight breakdown + live "week so far"), `PicksStatusBoard` ("who's picked" counts), `AllInDeclarations`, the live sweat board, and `CommentsSection`. Each has a distinct job (your own status vs the group's on-the-record calls vs live cover), so nothing is pure redundancy, but it sits at the upper bound of busy — `src/lib/components/picks/PicksBoard.svelte` (composition), `PicksSummaryBar.svelte`.
- On-brand / heart: Squarely on-heart — the 🐳 "This week's All-Ins" board, "Confirm All-In? That's 10 points riding on one game", the restrained "LIVE" pulse with an "· unofficial" caption. Swagger lives in the copy, controls stay clear (DESIGN principle 14); the ember is spent on the one signature moment, not sprayed — `AllInDeclarations.svelte`, `WeightSelect.svelte`.
- Right for ~6 friends: Sized for the known room — status board names laggards ("waiting on Hank"), the accepted All-In fade/copy asymmetry is justified _because_ it's a handful of friends (ADR-0023 §4). No stranger/anti-abuse machinery; multi-group banner degrades gracefully — `PicksStatusBoard.svelte`, `PicksBoard.svelte` (multi-group-banner).
- Strategic timing: Serves the current arc — All-In declarations (#360/#229) and the live sweat board (#386) are exactly the engagement-polish phase, and both are built group-aware (`all_in_declarations` RPC is `p_group_id`-scoped, `getGroupPicks`/social are group-scoped) so they carry into single→multi-group with no retrofit — `getAllInDeclarations.ts`, `+page.server.ts`.
- Lifetime cost / ops drag: The one durable tax is the live board's ESPN pass-through plus `src/lib/domain/liveCover.ts` — a pure-TS re-implementation of the SQL grading path that must be kept textually in sync (parity unit test enforces it). It's well-bounded: self-gated to a 6h live window, one shared server fetch per window regardless of headcount, no cron, no matview, no DB write, display-only — `src/lib/live/config.ts`, `liveCover.ts`.
- Gates (fairness / reversibility): Respected, not tripped. Pre-kickoff reveal is confined to `weight='A'` via the security-definer `all_in_declarations` RPC with base-table RLS untouched (ADR-0023); co-member picks and comments render only on started games (`{#if started && userId}` gating `RevealedGroupPicks`; social loads `startedGameIds` only); kickoff lock and grading are server-authoritative (`liveCover` is explicitly never the settlement authority). The surface _created_ a reveal-boundary question and _closed_ it with an ADR — no new integrity or one-way-door problem.

**Recommendation:** [P2] Keep as-is. No reshape is warranted — every element earns its place. The only watch item is density: this is the surface most likely to tip into "busy," so the next engagement addition should displace an existing element rather than stack onto it, and the `liveCover.ts` ↔ SQL-grading parity test must be treated as a hard gate whenever grading logic changes.

### /league (standings + week + manage) — Verdict: Keep

**Justification:** This is Hotshot's heart surface — standings + honors + weekly hardware are exactly "feed the group chat" — built on cheap matviews and timed dead-on to the multi-group arc; it fails no lens and trips no gate.

**Lens read:**

- Value vs noise: Earns its complexity. The #631 re-containment was itself a de-bloat move — one control per tab (season/all-time on Standings, week picker on Week), honors folded in from the retired Group tab, and each heavy element gated (`SeasonRaceChart` only past a graded week, `RatingLadder` only with a rated member, `WeeklyHardware` only on fully-graded weeks). Only soft spot: the Standings panel stacks `StandingsTable` + "The race" + `LeagueHonors` + `RatingLadder` — dense, worth watching for creep, not actionable now. — `route:/league` / `src/routes/(app)/league/+page.svelte`
- On-brand / heart: Squarely on-brand — the ranked table, champion crown, trophy case, wooden spoon, the Commissioner chip on each row, "tap a name to trace their run." Swagger lives in copy, no gimmicks. This is the surface the others orbit. — `src/lib/components/group/LeagueHonors.svelte`, `src/lib/components/leaderboard/StandingsTable.svelte`
- Right for ~6 friends: Fits. Latent scale machinery exists (`membersCursor`/`totalsCursor`, the commissioner-chip note that a commissioner "past the first page renders unchipped") but it's dormant group-aware plumbing per ADR-0002, not ceremony the room pays for. Manage's invite/Web-Share/expiring-code apparatus is multi-group tooling, sanctioned by the arc, not premature. — `src/routes/(app)/league/+page.svelte:149`, `src/routes/(app)/league/manage/+page.svelte`
- Strategic timing: Directly serves the arc. `/league/manage` (#660) is the commissioner console — mint/revoke invites, promote/remove, rename, rules — i.e. the create/join/invite/switch on-ramp v2.0 is built around. Timed to the current phase, not a tangent. — `route:/league/manage` / `manage/+page.server.ts`
- Lifetime cost / ops drag: Low. Reads materialized leaderboard/trend/recap views (ADR-0013), adds no cron and no odds-API draw, and the Week tab reuses `/recap`'s single `['recap', groupId, season]` cache entry rather than a new payload (#631) — so hardware on the Week tab and the /recap archive can never disagree. Cost is the handful of commissioner API routes, all core to running a league. — `src/routes/(app)/league/+page.ts`, `/recap/+page.svelte`
- Gates (fairness / reversibility): N/A — this surface _respects_ the gate rather than tripping it. Grading preset freezes once the season's first game settles (`presetLocked`), drop-worst-week is non-retroactive with an explicit apply-from year (ADR-0018), and the Manage authorization boundary re-reads `group_memberships` fresh (the /league button's cached `isCommissioner` hint only ever shows a button that bounces, never a leaked control). The `/recap` route still exists as a CTA-reached "Season recaps" archive (not a redirect, not duplicated prose — the Week tab deep-links to `/recap#week-N`), so #631 left no dead/duplicate surface. — `manage/+page.server.ts:42`, `recap/+page.svelte`

**Recommendation:** [P3] Keep as-is. The surface is the product's spine and is already the cleaned-up (#631/#660) form. If anything is ever trimmed, watch the Standings-tab vertical density (race chart + full honors + all-time ladder) before adding a fourth block — but nothing to change today.

### /market — Verdict: Reshape

**Justification:** On-brand and cheap to run, and its week slate genuinely feeds the pick, but the full five-slice, five-year-pooled ATS explorer is over-built for six casual friends and — by its own repeated "descriptive, not predictive / small by design" copy — mostly browse-once noise; a leaner form survives.
**Lens read:**

- Value vs noise: Partly fails. `WeekSlate.svelte` earns its keep (each side's ATS in-situation, hyperlinked to `/picks#game-{id}` — a real pre-pick companion). But `MarketBends.svelte`'s own punchline is "Small by design — the line is efficient," and the pooled Primetime/Divisional/Spread cuts and per-team game logs (`+page.svelte` snippets `situationalDetail`/`teamsView`) are hedged as "descriptive, not predictive… noisy" — a lot of surface whose honest message is "everything's ~50%." — `route:/market`, `MarketBends.svelte`
- On-brand / heart: Passes. Charcoal-and-gold, data-led, no ember misuse; the deliberate Market≠League naming (`BottomTabBar.svelte` comment) is exactly the Commissioner's discipline. Leans "analytics," not "trash talk," but delivered in the restrained house voice — sounds like Hotshot.
- Right for ~6 friends: Fails hardest. Five-year pooled situational cuts, divisional/primetime splits, spread buckets and per-team game-log drilldowns assume an analytics-hungry audience; the wall of "treat small samples with caution" caveats is the tell that it's built with rigor for a room that mostly won't drill in. — `+page.svelte` (scope dropdown + 5 slices), `leagueSlices.ts`
- Strategic timing: Neutral. Group-independent (`+page.server.ts` needs no `groupId`), so it neither serves nor blocks the single→multi-group arc; it already shipped in the engagement-polish era. Fine to leave, but further expanding it would pull focus off the on-ramp.
- Lifetime cost / ops drag: Low runtime cost — rides existing ATS materialized views and odds ingestion (ADR-0017), no new cron or external call; slate uses `staleTime:0` reads only. The real tail is code-surface: a ~700-line page plus ~8 components/utils/endpoints to keep on-brand and clean at 390px.
- Gates (fairness / reversibility): N/A. Data is "the same for everyone" (public historical ATS, symmetric, no reveal/lock impact — picks still lock at kickoff); read-only over existing models, no new persistent model or one-way door.
  **Recommendation:** [P2] Reshape to a lean "Market" = `WeekSlate` (the pre-pick companion) + By-team ATS records + the single `MarketBends` synthesis as the honest lead. Retire the deep explorer that the room won't revisit — the pooled 5-year window and the Primetime/Divisional/Spread drill-in slices and per-team game logs — folding any genuinely conversational nugget back into the week slate. Not urgent (shipped, on-brand, not unfair), so P2 polish, not P0/P1.

### /stats — Verdict: Keep

**Justification:** On-brand, strictly group-scoped, already multi-group-ready, and the heaviest read-model surface in the app rides the _sanctioned_ bounded refresh pattern rather than a new cron — it clears every lens, with only a P3 matview-creep watch.

**Lens read:**

- Value vs noise: Earns its complexity, and has been actively de-bloated — #567 folded three preamble cards into one `StatsHero`, #575 consolidated the credibility hero into it, #538 flattened a nested accordion to one `ChipRadiogroup`. The `SignatureTells` "signature strip" is the real value-add: it translates raw cuts into plain sentences ("You keep fading DAL", "You lean underdog"). Every cut is sample-guarded (`EXPLORER_MIN_SAMPLE`, `TEAM_BOOK_MIN_SAMPLE`, `lineSideTendency`'s 10-pt "balanced" collapse) so thin rows dim instead of plotting noise. Soft spot: `SituationalExplorer` ("Every split", 4 dimensions × buckets) partly re-serves what the strip already headlines — `StatsHero.svelte` / `SituationalExplorer.svelte` / `SignatureTells.svelte`.
- On-brand / heart: Yes — copy carries the voice ("Teams you ride" / "Teams you fade", "beat the market", "the numbers and the tells behind them"), gold spent only on the earned `RatingBand` ("Hotshot" apex tier, #620), no ember splash. Analytics-only by design; standings/rank deliberately kept on `/league` (ADR-0018) so it never competes with the trophy moment — `StatsHero.svelte`, `RatingBand.svelte`, `TeamBook.svelte`.
- Right for ~6 friends: Sized for the room, not strangers — the H2H grid is literally "you vs each of your 5 friends on games you disagreed on", the market baseline IS the room's own par (`league_situational_baseline`), and the player picker is friend-scouting. "Every split"'s diverging-bar apparatus is the one flirt with quant-seriousness, but it degrades gracefully in a small room (fewer rows, dimmed thin cuts) — `+page.svelte` context bar + `SituationalExplorer.svelte`.
- Strategic timing: Serves the arc — every query is `group_id`-filtered (`getTeamBook`, `getSituationalSplits`, `getPlayerRatings` in `stats.ts`), so it needs zero multi-group retrofit, and recent work on it (#564–575, #514) _is_ the current engagement-polish phase. Per-player scouting gets more valuable as groups grow — `stats.ts` / `+page.server.ts`.
- Lifetime cost / ops drag: The app's most expensive read surface — ~17 materialized views in `refresh_leaderboard_stats()`, many existing solely for it (team book ×2, situational base, line side, H2H ×2). But the cost is bounded and on the endorsed pattern: refresh piggybacks on the grading run (no new cron, no odds quota), runs `CONCURRENTLY`, is served from a `(group,season)`-keyed cached `createQuery` with SSR prefetch (ADR-0017) and streamed career detail, and situational added just ONE base matview with plain views on top — `refresh_leaderboard_stats.sql`, `stats_situational_base.sql`, `+page.ts`.
- Gates (fairness / reversibility): N/A — reads settled data only (no pick-lock/reveal/grading surface); read models are droppable/rebuildable matviews with no external dependency or public surface.

**Recommendation:** [P3] Keep as-is. Watch the matview creep (17 and counting; each new cut is another refresh line and grows the on-grade refresh time — a `season-ops` signal, not a redesign) and revisit whether `SituationalExplorer` earns its full per-bucket browser over the `SignatureTells` strip that already delivers the headline; if that overlap ever grows, the on-brand reshape is "keep hero + signature strip, demote 'Every split' to an expand-on-tap receipt."

### /wrapped — Verdict: Keep

**Justification:** The rubric's own heart names "the Wrapped champion reveal" as a signature moment; it's group-aware, near-zero recurring cost, and lands exactly in the current engagement-polish arc — it fails none of the kill-questions.
**Lens read:**

- Value vs noise: Earns its complexity — a once-a-year season close that consolidates champion/wooden-spoon/standings + a per-player packet (rank, record, best week, All-In, contrarian, nemesis, badges) into one moment, reusing existing read-models and the ADR-0008 voice pipeline rather than new machinery; stat grid is deliberately numbers-only with badges quarantined to their own showcase (ADR-0035), so serious and fun stay in separate lanes — `route src/routes/(app)/wrapped/+page.svelte`, `component WrappedStory.svelte` (cards derivation lines 19-97). Only honest tax is surface breadth (orchestrator + 4 components + flash + promo + mark-seen API + backfill cron + refresh script + demo variant) for an annual payload.
- On-brand / heart: Yes — this is the rubric's canonical signature moment (`docs/PRODUCT.md` heart, bullet 4). Champion gets 🏆, wooden spoon 🥄, and the Commissioner's-voice AI "Season Recap" prose feeds the group chat; emoji stays fenced into the badge/title showcase while the reveal itself sits in quiet-premium stat cards — `WrappedStory.svelte` (champion card 71-78, recap blurb 155-171). Minor note: the "champion reveal" is currently just a 🏆 stat card, less of a _reveal_ than the copy promises.
- Right for ~6 friends: Yes — two tabs (Your Year / The League), one AI packet per _active player_, room-scale intimate stats (nemesis, contrarian, All-In). No stranger-audience or scale ceremony; deliberately no permanent nav tab (`BottomTabBar.svelte` line 14) — surfaced via a dismissible League-home CTA and a once-per-season flash — `WrappedPromo.svelte`, `WrappedFlash.svelte`.
- Strategic timing: Serves the arc — generation loops per `group_id` (`sendSeasonWrappeds` in `src/lib/server/seasonWrapped.ts` 167-203), so it's multi-group-ready now; the flash/promo + server-side `wrapped_seen` (#548, CHANGELOG) are exactly the engagement-polish the private-beta phase wants. No distraction from the single→multi-group on-ramp.
- Lifetime cost / ops drag: Low recurring cost — generation piggybacks inline on the existing grade cron, gated to the final scoring week only (`src/routes/(app)/api/cron/grade/+server.ts` 116-127), so no new hot-path cron; AI spend is capped at `SEASON_MAX_COST_USD = 0.5`/group/season (`voice.ts` 23) at ~$0.006/run with deterministic fallback per subject. Standing cost is one small `season_wrapped` table plus an occasional `backfill-wrapped` catch-up job — not a recurring tax.
- Gates (fairness / reversibility): N/A — read-only and post-season, sourced only from `league_completed_standings` (frozen/graded, ADR-0024), respects `ai_recap_opt_out` (opt-outs neutralized to "a player"); cannot touch locking, reveal timing, or grading. Its persistent table + external AI dependency are one-way-door-adjacent but already covered by ADR-0008, not a new uncovered door.
  **Recommendation:** [P2] Keep as-is. Optional, non-blocking: give the champion "reveal" a touch more moment (it's currently a plain stat card) rather than expand the surface; no reshape or retire is warranted.

### Badges & weekly hardware — Verdict: Keep

**Justification:** A fun-layer that already governs itself to the rubric's standard — its own twice-amended ADR just cut 19→15 badges, walled the high-volume gongs off the curated shelf, and rides existing matviews at near-zero ops cost; it passes all five lenses and trips no gate.
**Lens read:**

- Value vs noise: Earns it — the catalog just survived a rigorous self-audit (#634–#652) that deleted every badge which couldn't resolve to "nobody," and the ~5-award/week hardware is deliberately quarantined on the /recap archive, never beside the curated season Awards — `src/lib/domain/badges.ts` / `src/lib/components/group/LeagueHonors.svelte` (lines 214-215 comment) / `src/lib/components/recap/WeeklyHardware.svelte`.
- On-brand / heart: Textbook Hotshot — swagger lives entirely in the copy ("Went all in… and all in went wrong," "Followed the herd. Right off the cliff.") over quiet charcoal chips; the ember is spent elsewhere, badges own the room exactly per ADR-0035 — `FLAVORS`/`WEEKLY_AWARD_FLAVORS` in the two domain modules.
- Right for ~6 friends: The rare recognition layer sized _down_ for the room, not up — ADR-0035 v2 made every badge able to go dark (accepting "visibly empty slots"), lean badges take the league itself as their zero, and guards are tuned to 6-player/~270-pick seasons — `crowdLeanAxis`/`lineLeanAxis`/`computeSampleGuard` in `badges.ts`.
- Strategic timing: Serves the arc — engines are group-scoped and derived-on-read, so multi-group needs no retrofit, and the recent work was launch-readiness correctness (making the honors shelf honest before a wider beta), not a tangent — `src/lib/server/readModels/weeklyAwards.ts` (every query `.eq('group_id', …)`).
- Lifetime cost / ops drag: Low — no persisted award rows, both engines reuse matviews `/stats` already fetches (`badgeInputsFromSeasonStats`); the only standing tail is the optional AI-flavor layer (`ai_badge_flavors` table + manual `backfill-badge-flavors` cron) and the `group_pick_cover` matview from #387 — `src/lib/server/badgeFlavor.ts` / `src/routes/(app)/api/cron/backfill-badge-flavors/+server.ts`.
- Gates (fairness / reversibility): N/A — explicitly non-scoring recognition (ADR-0020, zero standings effect) and derived-on-read, so the trims themselves were "independently-reversible"; the AI-flavor table is regenerable cosmetic text, not a one-way door.
  **Recommendation:** [P3] Keep as-is — the recent #634–#652 audit already did the Reshape work (cut four more badges, relocated the streak idea to a sweat board). One watch-item only, not a reshape: weekly hardware is now 5 awards/week (the brief's "4" predates Backdoor #636) and the season "trophy shelf" tally is the lowest-signal piece — fine while it stays off the main /league surface; revisit only if the gong count starts drowning the curated season titles.

### Credibility rating — Verdict: Keep

**Justification:** It clears every judgment lens and trips no gate — a durable, market-anchored "who knows ball" number that is deliberately fenced from the room's fun, and is in fact the reference example PRODUCT.md itself cites for the value-vs-noise lens.
**Lens read:**

- Value vs noise: Earns its complexity — it's the _only_ cross-season measure (raw records are volume, season points reset), and it draws the clean serious/fun line PRODUCT.md prizes, enforced by ADR-0035 deleting The Sharp/Fool so nothing restates it. Real tension: the honest v2 spread is tiny (~1488–1522, ±35 pts across six players), so the meter had to be tightened to ±50 (`src/lib/domain/rating.ts`) to move at all — but the tier bands still discriminate and durability, not spread, is the point. `RatingBand.svelte` on `/stats`, `RatingLadder.svelte` on `/league`.
- On-brand / heart: Strongly on-brand — native betting vocabulary (Square/Sharp), the apex renamed **Hotshot** as the branded win-state (one pill louder: brass fill + ink ring + ★ in `RatingTierPill.svelte`), "who knows ball" is the Commissioner's voice, and Unrated renders honest silence not a fake number. Quiet-premium and data-forward.
- Right for ~6 friends: The sharpest kill-question — ELO scale, shrinkage prior, 20-decision gate _look_ like scale machinery, but they exist _because_ the room is small: shrink-toward-par + qualification gate are precisely what stop a noisy 6-player sample from misranking friends, and the whole v2 rewrite (conviction-flat, order-independent) was driven by real 6-player prod data. Per-`(group, user)`, single card, not a system. Passes.
- Strategic timing: Serves the arc — built per-group inside the tenancy boundary (`player_rating_inputs` view scopes by `group_id`), so single→multi-group is a no-op; each future group surfaces its own sharps. The `/league` ladder (#637) is engagement-polish, exactly the current phase. `src/lib/server/rating/computeRatings.ts`.
- Lifetime cost / ops drag: Marginal — no cron, no odds-API, no external call of its own; the rebuild rides the existing post-grade `refreshReadModels()` hook (`rebuild.ts`), self-heals on failure (logged, not thrown), and the read model is fully regenerable. Real footgun flagged and already fixed: "rebuild on every settlement path" caused a transient-empty `player_ratings` (#622), now guarded by the advisory-locked `_rebuild_player_ratings` RPC.
- Gates (fairness / reversibility): N/A — exemplary, not violating. Ranks real people yet was built gate-aware: ADR-gated, deterministic/pure/never-AI-decided, hidden-until-qualified (no provisional misranks), and `player_ratings` is a service-role-only derived read model (RLS-on/no-policy, `player_ratings_grants.sql`) that is never a source of truth, so the persisted table is trivially reversible from `pick_settlement`.
  **Recommendation:** [P3] Keep as-is. No smaller form is warranted — it has already been reshaped twice (v1→v2 stripped conviction and the sequential fold; ADR-0035 fenced it from badges). Two watch-items only, no action: the compressed ~±35-pt spread means the number barely separates six friends, and the "rebuild on every path" invariant remains a latent footgun — revisit only if either bites.

### Catch-up mechanics — Verdict: Keep

**Justification:** Passes every judgment lens and reinforces (rather than trips) both gates — it is the repo's own canonical example of "recognition over equalization," shipped as a decision _not_ to build plus zero-point badges on an existing engine.
**Lens read:**

- Value vs noise: Earns its complexity by mostly _declining_ complexity. ADR-0020 validated against 4 real prod seasons (comebacks are already the norm — 3 of 4 champions trailed 30-39 pts; 2022/2023 champs first led in week 18) and rejected the points-boost (Option B) and mulligan-token table+RLS+UI (Option C). What shipped is a 3-line predicate inlined into _existing_ matviews (`src/lib/domain/scoring.ts` mirrors it) plus four pure-function badges — `theComeback`/`weekWinner`/`theCardiac`/`bestOfTheRest` in `src/lib/domain/badges.ts`, computed with "no extra round-trips" per `src/lib/server/readModels/groupCache.ts`. Marginal added surface is near-zero.
- On-brand / heart: This _is_ the heart. PRODUCT.md's competitive-integrity bullet and the fairness gate both cite ADR-0020 by name. Flavor copy is pure Commissioner voice ("Buried in the standings. Unbeatable for a week.") — swagger in copy, clarity in the furniture, exactly DESIGN principle 14. Rendered via `src/lib/components/group/LeagueHonors.svelte` on `/league`.
- Right for ~6 friends: Explicitly n≈6-reasoned — rejected Option B as "lumpy at n≈6," and the badges "cannot be gamed by tanking" precisely because in a 6-person known room falling behind on purpose is socially visible and strictly worse than just playing well. It refused the anti-abuse/engagement machinery a stranger-scale product would bolt on.
- Strategic timing: ROADMAP parks "catch-up mechanics" in the decide-when-wanted backlog, ADR-gated. Resolving it as "no scoring build" clears the backlog item with zero pull on the single-group→multi-group arc, and ADR-0018's non-retroactive, season-scoped predicate (`enabled AND start_year set AND season_year >= start_year`) is the multi-group-safe pattern future rules must reuse — it serves the arc.
- Lifetime cost / ops drag: No new cron, no odds-API quota, no new matview. Drop-worst is inlined into the three existing standings matviews; badges are pure over already-fetched rows. Only standing tax is the hand-synced predicate duplicated across 3 SQL views + the TS mirror in `scoring.ts` (documented as an ADR-0018 consequence, commented at each site). Immaterial on a handful of players.
- Gates (fairness / reversibility): N/A as a problem — the opposite. ADR-0018 _fixed_ a latent integrity bug (the old ADR-0005 boolean was retroactive and would have rewritten closed imported 2022-2024 seasons, and made career ≠ Σ seasons across ~11 surfaces); the start-year predicate makes retroactivity "impossible by construction," and the comeback badges attach zero points so they cannot move standings. This surface hardens the fairness gate rather than tripping it.
  **Recommendation:** [P3] Keep as-is. It is already the smallest on-brand form. One thing to watch, not act on: the four comeback badges add to a roster that was just pruned in #647 (The Homer/Nemesis/Hot Hand cut for measuring the wrong thing) — re-check at the next badge audit that each still measures its label, and keep the 4-copy drop-worst predicate textually in sync on any future edit.

### Notifications & preferences — Verdict: Keep

**Justification:** It's the app's pull-back-to-the-app engine for exactly the engagement-polish phase the roadmap names, is already group-aware for the coming multi-group arc, and adds zero new crons — only the line-shift sub-feature over-assumes a line-watching seriousness the room lacks.
**Lens read:**

- Value vs noise: Earns its complexity as a whole — pick reminders feed "did you get your picks in?" and the recap pushes feed the trash talk, i.e. it directly serves "the group chat is the point." The one weak link is line-movement alerts (per-user points threshold + snapshot diff + once-per-pick/day cap): the most machinery for the least conversation-value. — `src/lib/server/notifications.ts` (`detectLineShifts` vs `sendPickReminders`/`sendResultsRecap`/`sendAIRecapPushes`), `/settings` Notifications card.
- On-brand / heart: Yes, and improving. #683 (`recapPushBody` in `src/lib/domain/notifications.ts`, wired in `sendAIRecapPushes`) puts the recap's juiciest opening beat on the lock screen instead of "your recap dropped" — swagger-in-the-copy done right, and the weekly voice prompt in `src/lib/server/recap/voice.ts` was nudged to open with a self-contained hook to match. Line-shift copy ("Line moved on your pick") is the one utilitarian, least-Commissioner voice.
- Right for ~6 friends: Restrained where it counts — a master switch plus a few toggles, no digests/quiet-hours/channels (`/settings` `+page.svelte`). The single over-build is the configurable line-movement threshold, a sportsbook-flavored knob that assumes sharp bettors watching numbers, not a casual pick'em.
- Strategic timing: Dead-on. ROADMAP v2.1 explicitly names "notification nudges, pick-and-results reminders" as engagement polish, and this is already built group-aware (`sendAIRecapPushes` iterates `group_memberships`; `notification_log.group_id`), so it needs no retrofit at the multi-group boundary. — `src/routes/(app)/api/cron/grade/+server.ts`.
- Lifetime cost / ops drag: Low. It piggybacks on the existing hourly pregame and grade crons — no new cron, and line-shift reuses the near-kickoff odds sync so no new odds-API quota (`src/routes/(app)/api/cron/pregame/+server.ts`). `sendToUser` self-prunes dead 404/410 endpoints (`src/lib/server/push.ts`); the only mild tail is `notification_log` growing without a retention sweep (trivial at 6 users).
- Gates (fairness / reversibility): N/A. Notifications are read-only observers — they fire after grading (recap gated on `isWeekFullyGraded`), never mutate pick-locking or reveal timing, and line-shift shows only the user's own locked line vs current (no leak). `push_subscriptions`/`notification_log` and the web-push dependency are persistent/external but were established back in v1.5, degrade gracefully, and this surface created no fresh one-way door.
  **Recommendation:** [P2] Keep the pipeline, prefs UI, and #683 headline as-is; trim line-movement alerts as the one off-room piece — either drop the per-user threshold knob (fire on a single sensible fixed move) or retire the alert entirely, folding "your line moved" into the existing pick-reminder nudge so the casual room isn't handed a sportsbook control.

### /demo — Verdict: Keep

**Justification:** It's the single top-of-funnel asset the compound-over-time game needs, renders the real components so it _is_ Hotshot, and is structurally isolated with near-zero per-visitor cost — it clears every lens; its only weakness (content staleness, #607) is a maintenance follow-up, not a reason to reshape or retire.
**Lens read:**

- Value vs noise: Earns its complexity — a new visitor to a results-compound game otherwise lands on an empty one-name leaderboard (ADR-0026 §Context); `/demo` shows both the _verb_ (frozen live-week sweat via readonly `PicksBoard` in `src/routes/demo/+page.svelte`) and the _payoff_ (leaderboard/awards/Wrapped/recap), drawing a clean serious/fun line rather than adding a fifth surface to the app. The ~14k-line fixture (`src/lib/server/demo/demo-snapshot.json`) is a build artifact, not runtime weight.
- On-brand / heart: Strong. #669 (`docs/changelog.d/claude-669-demo-parity.md`) replaced hand-mirrored components with the _real_ shared `StandingsTable`/`RatingLadder`/`WrappedStory`/`RecapCard` (see imports in `src/lib/server/demo/__tests__/demo-snapshot.test.ts`), so it looks and reads identically to the authed app — charcoal/gold, the Commissioner's voice frozen from the real LLM pipeline (`meta.aiProse: "live"`, `regenerateDemoRecaps` in the cron endpoint). The "you" persona (Beth, the champion) is the second-person hook, and signature moments (All-In sweat, Wrapped reveal) render as they truly would.
- Right for ~6 friends: This is the _one_ surface correctly built for strangers, and it does so without imposing stranger-scale machinery on the room — structural isolation (`src/lib/server/demo/snapshot.ts` reads only the fixture, no live DB) means zero `is_demo` predicates in real queries forever, and every write control is disabled into a "Sign up" CTA (`DemoSignupCta`, ADR-0026 Decision 3). Seriousness/polish stays confined to the funnel.
- Strategic timing: Directly serves the current arc. Private-beta launch-readiness and single-group→multi-group both need a shareable "see the finished season → start your league" link; it's wired as the on-ramp (`auth/+page.svelte` "Just curious? Try the demo", `/join` demo escape hatch).
- Lifetime cost / ops drag: Deliberately low — static edge-cacheable page, **zero** per-visitor LLM calls or odds-API/matview draw (recap frozen at regen, ADR-0026 Decision 4); the `/api/cron/demo-snapshot` endpoint is invoked only manually via `pnpm demo:snapshot`, not on a schedule. The real standing tax is _content_ curation: the CI drift-guard (`demo-snapshot.test.ts`) verifies shape and badge-catalog subset but not editorial freshness, so it can stay green while the season goes materially stale (#607 open). Fixture currently fresh (`generatedAt 2026-07-15`, completedSeason 2024 vs live 2026).
- Gates (fairness / reversibility): N/A — fairness is structurally clean (no demo rows in prod, read-only, deterministic; nothing to leak into standings). Reversibility _is_ a one-way door (public unauthenticated surface), but that door was opened deliberately under Accepted ADR-0026, not newly by this surface.
  **Recommendation:** [P2] Keep as-is; close the content-parity gap (#607) by extending the drift-guard with an editorial-freshness signal — e.g. assert `completedSeasonYear` stays within N of `liveSeasonYear` and warn on `meta.generatedAt` age — so a green guard can no longer mask a stale demo season (the exact coverage-vs-shape blind spot ADR-0026 §6 and the #669 amendment already flag).

### Feedback — Verdict: Keep

**Justification:** A launch-readiness beta needs a low-friction "tell us" channel, and this one is proportionate, Hotshot-voiced, and dead-on the current private-beta arc while tripping no live gate — the heaviest machinery (public-repo egress) is justified by publicness, not by imagined scale.

**Lens read:**

- Value vs noise: Earns its complexity for the phase — one tap → one text box → one `feedback` row → instant "Got it — thanks. 🔥", replacing reports "scattered across texts and DMs." Capture stays lean (`src/lib/components/feedback/FeedbackWidget.svelte`, `src/routes/(app)/api/feedback/+server.ts`); complexity concentrates in the admin queue (`src/routes/(app)/admin/feedback/+page.server.ts`) but is admin-only and never touches the players' surface. Clean serious/fun split: casual capture vs. sanitized, human-in-the-loop GitHub filing.
- On-brand / heart: Sounds like Hotshot — "Spotted something?", the 🔥 ember toast, and a "Beta" tag framed as "an invitation to report, not a quality disclaimer" (`AppHeader.svelte`), kept deliberately left of the avatar and away from scores/standings/money. Mild tension only: a persistent floating action button is furniture on every authed route (`FeedbackWidget.svelte` line 84–92), which pushes lightly against "swagger lives in copy, not furniture" — but it's small and beta-appropriate.
- Right for ~6 friends: This is the sharpest kill-question and it survives. The sanitizer/allowlist/fine-grained-PAT/degradation stack (`src/lib/server/feedback/github.ts`) reads like scale machinery but is driven by the repo being _public_ (world-readable egress of user text), not by audience size; it pointedly builds no anti-abuse/rate-limit/moderation apparatus. User-scoped, not group-scoped (`supabase/src/policies/46_policies_feedback.sql`) — correct, feedback is a user→operator channel. It is the heaviest surface relative to the room, but proportionate.
- Strategic timing: Squarely on-arc. ADR-0028 opens "We are about to market Hotshot to friends and a small beta audience" — capture is the exact instrumentation a private beta needs; it de-risks launch rather than distracting from single→multi-group. Reuses existing infra (Sentry, `__BUILD_ID__`, `ui/sheet`) per `src/lib/feedback/context.ts`.
- Lifetime cost / ops drag: Low but non-zero. No cron, no odds quota, no matview, no LLM/provider cost (deliberately store-first). Standing costs: one `GITHUB_FEEDBACK_TOKEN` PAT to rotate (≤366-day expiry on the operator's personal account) and one unbounded-but-tiny table (no retention pruning by design — the rows are the inbox). The degradation-to-prefilled-URL path (`+page.server.ts` line 98–99, 115–116) bounds the one real liability so filing never hard-fails.
- Gates (fairness / reversibility): Fairness N/A — zero contact with pick-locking, reveal timing, grading, or standings. Reversibility was correctly tripped at design time (persistent `feedback` model + public GitHub egress) and _resolved_ by ADR-0028 with a single-repo fine-grained PAT, admin gate, human-in-the-loop review, and an allowlist sanitizer where the user-id UUID / Sentry id are structurally unreachable — handled, not an outstanding one-way-door problem.

**Recommendation:** [P3] Keep as-is. Two trivial, non-blocking notes: the ADR-0028 follow-up called for the Beta tag to be _config-gated_ so it flips off in one change at public launch, but `AppHeader.svelte` gates it only on `{#if user}` (no flag) — worth a real config gate before the public epoch; and if PAT-rotation ops drag ever bites, the on-brand smaller form already exists and is documented in the ADR — drop the server token and keep only the prefilled-URL path (the current degradation branch), trading one-click filing for zero standing secret.

### Onboarding (welcome modal + /how-to-play) — Verdict: Keep

**Justification:** It is the current arc made concrete — a cheap, on-brand, room-sized surface that teaches non-obvious rules and pre-wires multi-league, and the one open drift concern is already resolved.
**Lens read:**

- Value vs noise: Earns its complexity. Teaches genuinely non-obvious mechanics (ATS picking, weights, symmetric scoring, once-a-week All-In, kickoff locks, non-counting weeks) that friends can't infer from the board. Minimal shape: a single shared `HowToPlay.svelte` renders in _both_ the one-time modal and the persistent page, so the two can never diverge — no duplication tax. The name-confirm field reuses the one onboarding moment to fix a real papercut (email signups inheriting an email local-part as their leaderboard name). — `src/lib/components/howto/HowToPlay.svelte`, `src/lib/components/howto/WelcomeGuide.svelte` (name field lines 98-115).
- On-brand / heart: Sounds like Hotshot — warm and confident without over-swaggering ("your commish", "save it for the game you trust most", "no penalty for sitting one out"). Correctly restrained on signature moments: describes All-In and the sweat board factually rather than hyping them, honoring the "spend the ember sparingly" tenet and DESIGN principle 14 (personality in copy, clarity in controls — right for an instructional surface). — `HowToPlay.svelte` (All-In §, "Beyond the picks" §).
- Right for ~6 friends: Assumes exactly the small, known, casual room — "how you stack up against your league," "your commish sets a few house rules." No stranger-audience or engagement-farming machinery. The "you pick once and it counts in every league you belong to" line is multi-league-aware without building anything premature. — `HowToPlay.svelte:8`, leaderboard/house-rules §.
- Strategic timing: Dead-on. Onboarding _is_ the v1.9 on-ramp (and the current private-beta launch-readiness/engagement-polish phase); it serves the single-group→multi-group arc directly and even pre-teaches the multi-league model. Auto-opens once for new users on any app route except the reference page. — `src/lib/components/howto/guide.ts` (`shouldAutoOpenGuide`), mounted `src/routes/(app)/.../+layout.svelte:206`, `src/routes/(app)/how-to-play/+page.svelte`.
- Lifetime cost / ops drag: Near-zero recurring cost — static Svelte copy, one `guideSeenAt` flag, one profile POST; no cron, odds quota, or matview. The only real tail is copy-sync maintenance: it _did_ rot once (said "Group," omitted the credibility rating / Weekly Hardware / sweat board), which #633/#666 fixed. Current copy verified correct, including "Sharp" as a rating tier (Square/Solid/Sharp/Hotshot), not an award — consistent with #634 cutting the duplicate "The Sharp" badge. — `docs/changelog.d/claude-633-welcome-modal-refresh.md`, `.../claude-666-group-to-league-copy.md`.
- Gates (fairness / reversibility): N/A. Read-only informational surface — touches no pick-locking, reveal timing, or grading; state is a throwaway `guideSeenAt` boolean, no one-way door.
  **Recommendation:** [P3] Keep as-is. It is already in its most on-brand minimal form (shared copy component + one-time modal + persistent reference). Optional P3 follow-up only: add a lightweight drift guard (e.g. a fixture/snapshot check tying the copy's feature list to the nav/awards catalog) so the copy can't silently rot again the way #633 did.
