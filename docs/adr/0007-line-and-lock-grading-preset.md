# ADR-0007: Line and lock grading preset (House vs Gamer)

- Status: Proposed
- Date: 2026-06-24
- Issue: #108
- Supersedes: None

## Context

Every player is graded today against the spread snapshotted at **their own
pick-submission time**. `lock_pick()` freezes the active `game_lines` row into
`picks.locked_spread_team_id / locked_spread_value`, and grading
(`grade_pick()` → `ats_margin_at_lock()` → `_grade_games_by_ids()`) always uses
that frozen value. This is "Gamer" behavior, and it is already fully implemented.

As the group grows and players pick at different times, the graded line diverges.
Two players who pick the same side at different moments can settle oppositely on
click-timing alone:

> Chiefs open −3, drift to −6 by kickoff; Chiefs win by 4. Alice picks Tuesday
> (line −3), Bob picks Saturday (line −6), both at High (5).
>
> |                             | Line graded | 4 covers? | Result   |
> | --------------------------- | ----------- | --------- | -------- |
> | Gamer — Alice               | −3          | yes       | **+5**   |
> | Gamer — Bob                 | −6          | no        | **−5**   |
> | House (closing line) — both | same        | same      | **same** |
>
> A 10-point swing on an identical pick, purely from when each clicked.

This is a gameplay-fairness decision (ADR trigger), and ADR-0002 explicitly
deferred "the line-and-lock grading preset" to its own ADR. The per-group config
home already exists and is live: `group_config` (ADR-0002), alongside `line_source`
and `scoring_rules`.

Fairness (which line) and forgiveness (how much a missed week hurts) are two
independent dials. The casual-appeal goal — serving the busy player who forgets to
pick — lives on the forgiveness dial and is already handled by ADR-0005
(drop-worst-week) and notification work tracked separately. **This ADR is scoped to
the line/fairness dial only.**

## Decision

Make **House** the default line rule, selectable as a **per-group preset frozen for
the season**, with **Gamer** retained as an optional legacy preset.

- **House line = the closing line.** Under House, every member of a group is graded
  against the line **in effect at each game's own kickoff** — the closing line —
  not their pick-time line. The number is identical for all members of the group
  for that game. Because NFL games kick off across Thursday–Monday, the line is
  captured per game at its own kickoff; there is no week-wide cutoff and no
  commissioner action.
- **Pick lock is unchanged.** Players still lock a _side_ per game at kickoff, as
  today. House only changes the _line that side is graded against_; it aligns the
  line-lock to the same per-game kickoff moment that already locks picks. The live
  line is shown as guidance when picking, but the graded number is the closing line.
- **Config:** add `group_config.grading_preset` (`'gamer' | 'house'`). New groups
  default to `'house'`. The same migration pins the pre-existing original group
  (the single known `DEFAULT_GROUP_ID` row) to `'gamer'`, so **no historical week is
  regraded** — its settlements continue to compute from the frozen locked lines
  exactly as today.
- **Frozen per season.** A group's preset is chosen before the season and not
  changed mid-season; switching mid-season would alter grading semantics for
  not-yet-graded games and invite disputes.
- **The core is untouched.** Conviction weights (Low 1 / Med 3 / High 5 + one
  All-In ±10), per-game kickoff lock, symmetric win/loss/push scoring, and
  "no pick = not scored" are unchanged. House changes only the reference line.

## Consequences

- The pick-timing edge disappears: identical picks settle identically within a
  group, and every outcome is explainable from one shared line.
- The closing line is automatic — no commissioner cutoff to set, no weekly ops, and
  the multi-day slate is handled natively (each game uses its own kickoff line). It
  reuses the per-game kickoff moment the app already enforces for pick locks.
- Players no longer lock a **known number** at pick time; they pick the side and are
  graded on the closing line. The live line is shown as guidance but can drift
  before kickoff. This is a real UX shift to communicate (see the How-to-Play guide,
  #141).
- Grading gains a branch: `grade_pick()` / `_grade_games_by_ids()` must select the
  line by preset — `picks.locked_spread_value` for Gamer (today), the captured
  closing line for House. The House path needs the closing line captured per game at
  kickoff and stored group-visibly. Added grading complexity plus a migration.
- Two line rules must be maintained and tested going forward — the standing cost of
  keeping Gamer available as a legacy preset.
- House also makes notifications coherent (a shared line and deadline to announce),
  but that value is pursued separately (#92 and the notifications issue), not here.

## Alternatives considered

- **Keep Gamer as the only rule (status quo).** Zero work and backward-compatible,
  but it enshrines the timing-luck fairness bug and is the most casual-hostile
  option — it rewards late, attentive, line-watching play, which the busy player
  cannot do. Rejected as the default; retained as an optional legacy preset so no
  group is forced to migrate and no history is regraded.
- **House via a commissioner-set weekly cutoff.** Gives a known number and a single
  deadline, but on a Thursday–Monday slate it is either stale for late games (one
  early freeze) or ~4 manual freezes every week — recurring ops, and a fairness
  lever held by one person. Rejected.
- **House via a week-open snapshot.** Automatic and predictable, but the stalest
  line. Since staleness does not affect fairness under House (everyone shares the
  number), it buys nothing over the closing line while feeling more arbitrary.
  Rejected.
- **Per-player opt-in line-lock ("lock my number now").** The only mechanic that
  lets active and passive players coexist _fairly_ in one group, because the
  lock-now-vs-closing option is symmetric. Out of scope here: we chose per-group
  presets (one mode per group per season), not within-group coexistence. Parked for
  future research rather than discarded.
- **Switchable mid-season.** Rejected — changes grading semantics retroactively and
  invites disputes. The preset is frozen per season.

## Follow-up

- Implementation issue, created **only after this ADR is Accepted**: add
  `group_config.grading_preset` (default `'house'`; same migration pins the original
  group to `'gamer'`); capture the closing line per game at kickoff and branch
  grading by preset; pgTAP for House-vs-Gamer parity and a byte-identical
  no-regrade check on the original group; regenerated types.
- Forgiveness / casual-appeal is handled on the other dial, not here: ADR-0005
  (drop-worst-week) and notification reminders ("you haven't picked," results).
- Related: #109 (catch-up mechanics ADR), #107 (multiplier weeks extend
  `scoring_rules`), ADR-0002 (group config that hosts this preset).
- Revisit if a group ever wants active and passive players to coexist on one
  leaderboard — that would reopen the per-player line-lock alternative.
