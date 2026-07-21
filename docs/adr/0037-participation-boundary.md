# ADR-0037: Participation boundary — a member is graded only for games that start after they join

- Status: Accepted
- Date: 2026-07-16
- Issue: #711
- Supersedes: None

## Context

Grading enumerates the penalizable population as **every `group_memberships` row with
`status = 'active'` that has no pick for the game** (ADR-0024, decision A; the missed-pass
in `public._grade_games_by_ids`). That population has no temporal lower bound. Two situations
expose the gap:

1. **A league created midseason.** A league that first exists in Week 10 has active members
   but no picks for Weeks 1–9. A grade run over those earlier weeks manufactures a `missed`
   (−1 default) penalty per member per game for games played before the league existed.
2. **A member added to an existing league midseason.** Membership `joined_at` already records
   when each member joined, but grading ignores it. A member added in Week 4 immediately
   accrues missed penalties for Weeks 1–3 — games played before they could pick. This is a
   **live fairness defect for existing leagues today**, not only a hypothetical for midseason
   creation.

Both are the same shape: a member is being scored for games that were never theirs to pick.
The membership model constrains the solution space and resolves what first looked like a
separate "re-activation" question:

- `group_membership_status` is only `('active','pending')` — there is no `removed` state.
  Removal (`remove_member`, `leave_group`) hard-DELETEs the membership row; re-joining
  (`redeem_invite`) inserts a **fresh** row with `joined_at = now()`.
- `pick_settlement` does not cascade off `group_memberships`, so a removed member's graded
  history survives their removal.

So "re-activation" is not a state transition to model — it is already a fresh row with a fresh
`joined_at`. The only missing primitive is a per-league competition start, for the
midseason-**creation** case where `joined_at` alone is insufficient (the commissioner's own
membership `joined_at` is the creation instant, but that does not describe when _competition_
begins if they choose to start a future week).

This is the non-retroactivity family of decisions: ADR-0018 (drop-worst-week is
non-retroactive), ADR-0024 (frozen imported seasons + membership-scoped penalty). ADR-0009
(global picks fan-out) has a deferred join-time-backfill follow-up — copying a joiner's
still-open current-week picks into the new league — which is a **separate** issue; this ADR
provides the temporal floor that keeps such a backfill from ever backdating onto a game that
has already started.

## Decision

**A game counts for a member only if it starts on or after both the league's competition
start and the member's join.** Formally, a `(group, member, game)` triple is eligible for
settlement — real pick _or_ missed penalty — iff:

```
game.commence_time >= greatest(groups.competition_starts_at, group_memberships.joined_at)
```

**1. Persist an immutable per-league competition start.** Add
`groups.competition_starts_at timestamptz not null`. It is compared directly against
`games.commence_time` — no week foreign key, no per-season boundary. One league-lifetime
value covers "start now, mid-week" (`= now()`, earlier-today games excluded), "start a future
week" (`= that week's start_ts`), and full participation in every future season (all later
`commence_time` clear it) — which keeps the cross-season rating (ADR-0032) clean with no
per-season bookkeeping.

**2. Thread the eligibility predicate through the grading choke point.** The missed-pass in
`_grade_games_by_ids` gains the `greatest(...)` predicate (joining `groups`), so it never
creates a `missed` row for a game that starts before a member's participation begins. The
real-pick pass needs no gate — a member cannot have a pick on a pre-participation game — but a
pick that somehow predates the boundary is not a concern this ADR must defend against beyond
the pick-write path.

**3. Backfill existing leagues to an include-all sentinel.** Existing `groups` rows get
`competition_starts_at` set to a sentinel earlier than any real game (`'2000-01-01Z'`), so the
`joined_at` term alone governs them and **no currently-settled game becomes ineligible**.
`grading_locked` seasons remain inert to all grade paths regardless (ADR-0024).

_Amended during implementation (#712/#722):_ sentinelling only `groups` does not achieve this
ruling's own goal against the real data. Every production `group_memberships.joined_at` is
`2026-06-23` — the instant an earlier backfill created those rows, which post-dates the entire
2025 season those members actually played — so `greatest('2000-01-01Z', '2026-06-23')` would
make all 272 already-settled rows per member retroactively ineligible, precisely what this
ruling exists to prevent. The same include-all sentinel therefore applies to the **`joined_at`
term** as well, targeted at memberships already settled for a game predating their own
`joined_at` (a self-evident contradiction: you cannot have been graded for a game played before
you joined). A genuine late joiner keeps their real `joined_at`, so the boundary still binds for
them. Deliberately not restricted to unlocked seasons, so a member whose only history is an
imported `grading_locked` season is not stranded by the boundary-aware read surfaces of Issue B.

**4. Editable only until the first eligible kickoff.** The commissioner may change
`competition_starts_at` until the first game at or after it kicks off; thereafter it is
permanently frozen (no forward or backward move), because competition has begun and moving the
line would retroactively add or erase settled results.

**5. Creation UX: default to now, offer a future week.** `create_group` defaults
`competition_starts_at = now()` ("start this week, from now"); the creator may instead pick a
future week (`= that week's start_ts`). Default-now makes creation safe before any UI to change
it ships.

**6. Re-activation carries no gap credit.** A removed-then-re-joined member is a fresh
membership row with a new `joined_at`; they are eligible forward-only from that instant. Games
during their absence are neither scored nor penalized, and their pre-removal graded history is
untouched. No new status enum, interval model, or "rejoin" concept is introduced.

## Consequences

- **Fixes a live fairness bug**, not just a midseason-creation edge: any member added after
  Week 1 stops accruing penalties for games that predate their join. A scoped re-grade of
  already-graded weeks will _remove_ previously-manufactured pre-join `missed` rows for such
  members (standings shift in their favour — correctly).
- `competition_starts_at` becomes a durable constraint every present and future grade path and
  every _membership × games_ read surface must honour, alongside `grading_locked` and the
  membership-scoped penalty. The single choke point (`_grade_games_by_ids`) keeps the write
  side honest; read surfaces that enumerate membership independently of `pick_settlement`
  (completeness check, who's-picked board) must carry the same predicate or inherit correctness
  from `pick_settlement` (which never gains pre-participation rows).
- The completeness guard (`055_pick_settlement_completeness.sql`) loses its documented
  "assumes stable membership; a late joiner is an accepted false-positive" limitation — the
  predicate makes a late joiner correctly _not_ a gap.
- Freeze-on-first-kickoff means a commissioner who mis-sets the start has a bounded correction
  window; after kickoff the only remedy is a deliberate admin data fix, matching how
  `grading_locked` reversal already works.
- The include-all sentinel is a magic value; it is documented at the column and in the backfill
  migration so a future reader does not mistake it for a real competition start.

## Alternatives considered

- **Week foreign key (`groups.starts_week_id`) instead of a timestamp.** Rejected: a week FK
  needs a join to compare against `commence_time`, cannot express "start now, mid-week"
  (games earlier today already played), and reintroduces per-season boundary bookkeeping the
  timestamp avoids. The timestamp is strictly more expressive for less machinery.
- **A membership-interval / `removed` status model** to represent absences. Rejected: the app
  already hard-DELETEs on removal and re-inserts on re-join, so `joined_at` on the fresh row
  already encodes the boundary. An interval model would add a state machine to solve a problem
  the data model has already solved, with no product requirement to credit absence gaps.
- **Filter at every read query instead of at grading.** Rejected: it would leave wrong
  `missed` rows physically in `pick_settlement` and rely on every current and future reader to
  remember to exclude them — the exact fragility ADR-0024 moved to the single grading choke
  point to avoid. Gate at the write funnel; readers stay simple.
- **Editable at any time.** Rejected: moving the start after competition has begun
  retroactively creates or erases settled results — the retroactivity ADR-0018 exists to
  prevent. Freeze at first kickoff bounds the blast radius to the pre-competition window.

## Follow-up

- #711 — this decision.
- **Issue A (grading-integrity boundary):** #722 — the column + both sentinel backfills, the
  shared `_participation_start` helper, the missed-pass predicate, type regen, and pgTAP (both
  worked examples + within-week join + re-grade idempotency + the `055` completeness update).
  Shipped. `create_group`'s start-week argument and the `set_competition_start` guard RPC
  (rulings 4 and 5) moved to **Issue C**: the column's `default now()` already satisfies
  ruling 5 for every newly created league, and nothing calls either RPC until the start-week
  picker ships, so Issue A changes no RPC signature.
- **Issue B (read-surface audit):** verify/patch surfaces that enumerate membership × games
  independently of `pick_settlement`.
- **Issue C (creation/onboarding UI):** start-week control + partial-season copy
  (`docs/DESIGN.md` / ADR-0030).
- **ADR-0009 join-time backfill** (separate, deferred): copying a joiner's still-open
  current-week picks into a newly joined league — this ADR is its temporal safety floor.
