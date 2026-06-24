# ADR-0005: Drop-worst-week scoring

- Status: Accepted
- Date: 2026-06-24
- Issue: #107
- Supersedes: None

## Context

Issue #107 asks for two configurable, per-group scoring rules: drop-worst-week
and multiplier ("playoff push") weeks. We are shipping only **drop-worst-week**
now; multiplier weeks are deferred and remain tracked in #107.

Scoring semantics are gameplay-fairness decisions (ADR trigger), so the rule must
be pinned down before implementation rather than rediscovered from a view
definition. The infrastructure already exists: `group_config.scoring_rules`
(JSONB, per ADR-0002 group-owned config) is the designated home for these knobs,
and the season leaderboard is a group-scoped SQL view
(`leaderboard_season_totals`). The open questions are purely semantic: what
counts as a droppable week, when the rule engages, and what it does to a player's
displayed record.

## Decision

Add an opt-in, per-group rule that omits a player's single lowest-scoring week
from their season-total points.

- **Config:** `group_config.scoring_rules.drop_worst_week`, a boolean defaulting
  to `false`. Off for every existing group, so today's leaderboards are
  unchanged. Enabling is a service-role config write for now (no commissioner UI;
  that is #107's deferred v2.0-16 scope).
- **Unit of "week":** the sum of `points_delta` across a player's settled picks
  in one `(season, week)`. A week with no settled picks does not exist for that
  player and cannot be the dropped week.
- **Mechanic:** the season total is `sum(week_points) − lowest_week_points` when
  the rule is enabled and eligible; otherwise `sum(week_points)`.
- **Eligibility:** the drop applies only once the player has **two or more**
  weeks with settled picks. With one week, nothing is dropped (so week 1 is not
  degenerate).
- **Penalty/negative weeks are eligible.** A forgotten week scored entirely on
  missed-pick penalties is naturally the lowest and is exactly what the rule is
  meant to forgive.
- **Ties:** if two weeks share the lowest score, dropping either yields the same
  total. The rule subtracts that minimum once.
- **Record handling — points only.** Win/loss/push/decision counts, and the
  `wins`/`pushes` tie-breakers, continue to include the dropped week. The rule
  forgives points, not record. The rank ordering uses the adjusted total.
- **Mid-season changes:** the leaderboard is a live view computed from current
  config. Toggling the flag recomputes immediately; there is no historical
  snapshot of pre-toggle standings.
- **Scope is additive on the existing model.** Individual pick grading and
  `pick_settlement` are untouched; only the season-total view changes.

## Consequences

- A group can soften one bad week, including a week someone forgot to pick.
- The displayed record can look inconsistent with the points total (a dropped
  week's losses still show). This is an accepted, documented tradeoff in favor of
  a simpler, smaller view change; revisit if it confuses players.
- The season-total view gains a per-week aggregation pass and a `group_config`
  join. Modest added cost on a small (~6-player) dataset.
- Because totals are recomputed live, standings shift the moment the flag is
  toggled — fine pre-season, surprising mid-season. Operators should set it
  before a season starts.

## Alternatives considered

- **Drop the whole week (points + record).** More internally consistent, but a
  larger view change and a bigger behavioral shift in tie-breakers. Rejected for
  launch in favor of points-only; can supersede later if desired.
- **Materialize/snapshot season standings.** Would freeze pre-toggle results and
  cut per-read cost, but adds a refresh pipeline and staleness risk for a tiny
  dataset. Not justified now.
- **Store the rule on a global `weeks` column or the global settings table.**
  Violates ADR-0002 (per-group gameplay config lives in `group_config` /
  `group_week_overrides`, never on global rows). Rejected.
- **Per-player drop overrides.** Out of scope for #107 and adds config surface
  with no current demand.

## Follow-up

- Implements via a single migration to `leaderboard_season_totals`, pgTAP
  coverage (uniform scores, clear minimum, <2 weeks no-op, disabled no-op,
  cross-group isolation), and regenerated types.
- Multiplier ("playoff push") weeks remain open in #107 and will extend this ADR
  or get their own when built.
- A commissioner UI to toggle the flag is #107's deferred v2.0-16 scope.
