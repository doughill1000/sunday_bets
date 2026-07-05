# ADR-0018: Non-retroactive drop-worst-week scoping and standings reconciliation

- Status: Accepted
- Date: 2026-06-30
- Issue: #357
- Supersedes: ADR-0005

## Context

ADR-0005 shipped `group_config.scoring_rules.drop_worst_week` as one group-wide
boolean, applied live by `leaderboard_season_totals` to every season the group has
ever played. That has two defects, both rooted in the same design gap: the rule has
no season scope and no snapshot.

1. **Retroactive.** The prod group's 2022–2024 seasons were imported from
   spreadsheets the league already finalized — `historical-spreadsheets` Totals tabs
   recorded those seasons' totals **raw**, no drop. Enabling the boolean today would
   instantly rewrite that closed history (e.g. Doug 2022 −20 → 5, Mike 2024 116 →
   126), because the view has no concept of "this season predates the rule." This is
   why the flag is currently kept off in prod — toggling it on is unsafe.
2. **Career ≠ Σ seasons.** The drop is applied in exactly one of roughly eleven
   aggregate surfaces — the season-totals view. `stats_alltime_totals` and
   `stats_season_trend` both sum raw `points_delta`, so with the flag on, a player's
   career total stops equaling the sum of their own season cards, by exactly the sum
   of every dropped week. The season card also disagrees with its own trend graph's
   final cumulative value.

Base grading is not in question — every 2022–2024 per-season `pick_settlement` total
already matches the historical sheets exactly; nothing was re-graded. The wrong
numbers come entirely from how and where the drop is applied, which is a scoring
semantics defect (ADR trigger) and supersedes ADR-0005's mechanic, not its
forgive-points-not-record principle.

## Decision

Replace the single boolean with a **non-retroactive, season-scoped predicate**,
evaluated identically wherever a standings total is computed.

```sql
coalesce((scoring_rules->>'drop_worst_week')::boolean, false)
  and (scoring_rules->>'drop_worst_week_start_year') is not null
  and season_year >= (scoring_rules->>'drop_worst_week_start_year')::int
```

- **Requiring a start year makes retroactivity impossible by construction.** A group
  can flip `drop_worst_week` to `true` at any time with zero effect on any
  standings total until it also sets `drop_worst_week_start_year`; once set, the
  predicate only ever applies to that season and later. There is no code path that
  can reach back and alter a season already played.
- **Config:** `group_config.scoring_rules` gains `drop_worst_week_start_year` (int,
  nullable, default unset). `update_group_config` gains
  `p_drop_worst_week_start_year int default null`, merged into `scoring_rules` with
  the same "null = leave unchanged" convention as the existing boolean param. The
  ADR-0007 grading-preset freeze logic is unrelated and untouched.
- **Drop scope widens to every standings surface**, so a player's numbers agree
  everywhere they appear:
  - `leaderboard_season_totals` — `total_points` is drop-adjusted per the predicate,
    exactly as ADR-0005 specified, now scoped by season.
  - `stats_alltime_totals.total_points` — reworked from "sum of raw points" to "sum
    of each season's drop-aware standings total," so career is by construction the
    sum of the season cards, for every group regardless of flag state.
  - `stats_season_trend` — gains `is_dropped_week boolean`, true for the single
    lowest-scoring eligible week (ties broken by earliest `week_number`) only when
    the predicate holds for that `(group, season_year)` and the player has 2+
    settled weeks. `week_points`/`cumulative_points` stay **raw** — the trend is an
    analytics surface, not a second standings total; the marker lets the UI
    annotate which week was forgiven without the line itself jumping.
- **Records stay raw everywhere**, continuing ADR-0005: `wins`/`losses`/`pushes`/
  `missed`/`decisions` on every surface, and team/weight/head-to-head breakdowns
  (season and all-time), are computed without regard to the flag. The rule forgives
  points, not history of what happened.
- **Leaderboard owns standings, Stats owns analytics.** The Leaderboard surfaces
  (season totals, the now-reconciled career total) show the single canonical,
  drop-adjusted number — there is one right answer to "what is this player's
  total." The Stats trend remains a raw analytics series with an explanatory
  marker, not a competing total. This split is the naming/ownership contract the
  follow-up UX issue builds its labeling against.
- **One predicate, inlined three times, not one SQL function.** ADR-0013 made the
  three views materialized; any object the matviews depend on is dropped and
  recreated via `CASCADE` on every re-emission of any one of them. Inlining the
  three-line predicate keeps each view's `CASCADE` chain exactly as wide as it is
  today (zero new dependency edges), at the cost of the predicate text being
  duplicated. Each view's source file comments point at this ADR as the single
  source of truth for the expression, so the duplication doesn't drift silently.

## Consequences

- Enabling `drop_worst_week` with no `drop_worst_week_start_year` is inert
  everywhere — the safe default a commissioner can flip early without any visible
  effect, then commit to a season by setting the year.
- The prod group's imported 2022–2024 seasons are protected from being rewritten by
  the existing boolean; they only move if someone deliberately sets a start year at
  or before 2022, which is then an explicit, auditable choice rather than an
  accidental side effect of an unrelated toggle.
- Career totals are costlier to compute — `stats_alltime_totals` now aggregates a
  per-season drop-aware subtotal instead of one flat `sum()` — but the dataset is a
  handful of players across a handful of seasons, so the added CTE pass is
  immaterial.
- The predicate's three inlined copies (season totals, all-time totals, trend) must
  be kept textually identical by hand; a future change to the rule's semantics
  requires editing all three files in the same migration. Mitigated by each file
  commenting that the expression is governed by this ADR.
- `is_dropped_week` exists in the trend matview now, but no UI reads it yet — the
  marker is inert until the follow-up UX issue ships a stats-page indicator.
  `drop_worst_week_start_year` is likewise SQL/service-role-only until that issue
  ships a commissioner control.

## Alternatives considered

- **A shared SQL function for the predicate, called from each view.** Removes the
  three-way text duplication, but adds a fourth object to the `leaderboard_season_totals`
  /`stats_alltime_totals`/`stats_season_trend` `CASCADE` graph that ADR-0013 already
  has to manage on every re-emission, for a three-line boolean expression. Rejected;
  the duplication is cheaper to live with than the extra dependency edge.
- **Snapshot/freeze standings before a toggle.** ADR-0005 already rejected this for
  the same dataset-size and staleness reasons; a start-year scope solves the actual
  problem (protect specific past seasons) without a refresh pipeline.
- **A boolean per `(group, season)` instead of a start-year cutoff.** Would need a
  set- or array-shaped column and per-season UI; the real use case is "turn this on
  going forward," which a single integer cutoff expresses directly.
- **Drop the whole week (points + record), revisiting ADR-0005's points-only call.**
  Out of scope here — this ADR fixes scope and reconciliation, not the
  forgive-points-not-record mechanic, which is unchanged.

## Follow-up

- Follow-up UX issue (blocked on this ADR): commissioner control for
  `drop_worst_week_start_year`, the stats-trend dropped-week marker, career-page
  relabeling, and a leaderboard footnote explaining the adjustment.
- #347 (Wrapped) reads these same matviews and inherits the reconciliation
  automatically once this ships — no separate Wrapped-side change needed.
- Multiplier ("playoff push") weeks remain open in #107 and, if built, should reuse
  the same season-scoped, non-retroactive predicate pattern established here.

## Amendment history

None.
