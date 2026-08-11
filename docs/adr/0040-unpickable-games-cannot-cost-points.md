# ADR-0040: An unpickable game cannot cost you points — the missed-penalty pickability gate

- Status: Accepted
- Date: 2026-08-11
- Issue: #803
- Supersedes: None

## Context

`lock_pick` / `lock_pick_all_groups` refuse outright to record a pick on a game with no active
line for the league's book:

```sql
if not found then
  raise exception 'no active line for game % (source=%)', p_game_id, p_source ...
```

The missed-penalty pass in `public._grade_games_by_ids` had no matching gate. Its comment
stated the assumption in as many words — _"Line is irrelevant for missed picks"_ — and its
`WHERE` bounded the population only by locked season (ADR-0024 decision B), active membership
(ADR-0024 decision A), the participation boundary (ADR-0037), and "has no pick". Nothing asked
whether a line had ever existed. `resolve_missed_penalty_for_game()` reads
`settings.missed_pick_penalty` and never looks at the game at all.

So a game that reached kickoff unlined charged **every active member of every league** the −1,
for an inaction the system itself had forced. In a scoring week those rows land in
`pick_settlement` with `outcome = 'missed'` and count toward standings; ADR-0016's `is_scoring`
filter lives in the leaderboard/stats views, so it exempts preseason but not the regular season.

This is not a hypothetical. The most plausible trigger is the **Odds API monthly cap**:
`syncOddsForActiveWeek()` returns early when `canSyncNow()` is false, so hitting the cap
mid-season freezes odds sync entirely and an entire slate can reach kickoff unlined — nobody
can pick any game, and everyone eats −1 × up to 16 games. Lower-probability paths: a single
game the provider never covers, an outage spanning the pre-kickoff window, or a `line_source`
mismatch, where a line filed under a different book is invisible to the pick path while the
game still grades. The defect fires hardest precisely when something upstream has already
gone wrong, which is when standings damage is least excusable.

This sits in the fairness family alongside ADR-0018 (drop-worst-week is non-retroactive),
ADR-0024 (membership-scoped penalty, frozen imported seasons) and ADR-0037 (participation
boundary). ADR-0037 is the closest relative and the structural template: it bounded the same
missed-pass population by a **new orthogonal dimension** (time) without disturbing ADR-0024's
membership scoping, and did so in its own ADR rather than by amendment.

A read-only production audit taken while filing this decision found **zero** wrongly-charged
rows: all 232 `missed` settlements (227 in 2025, 5 in 2026) sit on games that had a
pre-kickoff line for the settling league's source. Every unlined final game in production
belongs to a `grading_locked` (2022–2024 imported) season that no grade path can reach. The
change is therefore purely preventative — no backfill, no standings movement.

## Decision

**A league is charged the missed-pick penalty for a game only if that league could have picked
it.** Formally, a `(group, member, game)` triple is eligible for a `missed` settlement only
when, in addition to every existing gate, the game was **pickable for that league**:

```
exists a game_lines row for the game
  where source     = coalesce(group_config.line_source, 'fanduel')
    and fetched_at <= games.commence_time
```

**1. One shared definition, `public._game_was_pickable(group_id, game_id)`.** A
`SECURITY DEFINER stable` helper, deliberately shaped like `_participation_start`: the rule
lives in one place so the write path, the completeness guard and the tests cannot drift apart.

**2. The gate keys off the same `line_source` the pick path resolves.** `lock_pick_all_groups`
— the RPC the app actually calls — resolves `coalesce(group_config.line_source, 'fanduel')`
per league, and the helper resolves it identically. A line filed under a _different_ book can
therefore never make a game gradable-but-unpickable. This makes the gate genuinely
**per-league**: a league on a book that never posted the game is exempt while a league on the
book that did still pays.

**3. Pickability is a historical question, answered by `fetched_at`, not `is_active_line`.**
`is_active_line` is a live pointer a post-kickoff sync can move, and its unique index is per
_game_ rather than per source. `fetched_at <= commence_time` is exactly the population
`_capture_closing_line` flags, so "was pickable" and "has a closing line" describe the same
set once capture has run — but unlike `is_closing_line` it is also correct _before_ a game's
first grade, which the completeness guard requires (capture only ever runs on the grade path,
#735). `game_lines` is append-only, so a row fetched pre-kickoff is durable proof.

**4. Gate the population, not the penalty amount.** The predicate joins the missed pass's
`WHERE`, so an unpickable game produces **no row at all**. Zeroing
`resolve_missed_penalty_for_game()` was rejected: a `points_delta = 0` row still carries
`outcome = 'missed'` and reads as a skipped pick to every downstream surface — streaks,
ratings, the who's-picked board.

**5. The completeness guard carries the same gate.** `public._settlement_owed` — the "does
grading owe anything for this game" predicate behind `find_unsettled_weeks` and
`advance_week_if_complete` — gains the identical pickability test on its membership clause.
Without it, an unlined game with no picks becomes a second way to legitimately owe zero rows,
and the zero-row test flags it forever: the reconcile sweep re-fires on every tick against a
week it can never heal, and the week never reports complete, which in turn strands the grade
cron's #744 settled-prior-week gate. This is the same negative-space failure ADR-0037's Issue
B discovered; the rule is that **every gate the write side gains, `_settlement_owed` gains
too**.

**6. The exemption stops at scoring.** An unpickable game simply produces no settlement rows,
and since standings, drop-worst-week, ratings and stats all read `pick_settlement`, it
contributes nothing. It is deliberately **not** removed from the week's slate: it still exists
in the schedule and still needs a final score for the week to complete. Excluding it from
week denominators, award eligibility and the picks-screen counts was considered and rejected
as a materially wider surface that overlaps #802's picks-UI affordance work.

## Consequences

- **The fairness guarantee the app is built on is restored**: a player is never punished for
  inaction that was not theirs. An operational failure (quota freeze, provider outage) now
  costs zero points instead of wrecking a season's standings.
- **No production data changes.** The audit above found no wrongly-charged rows, so no
  `prod-backfill` is required. Existing rows are left alone regardless: like ADR-0037's
  boundary, this gates what gets **written** and is not a delete.
- **Re-grading is idempotent.** An unpickable game is skipped by the `SELECT`, so no insert
  and no `on conflict` update fires — a penalty correctly withheld is never resurrected.
- `_game_was_pickable` joins `grading_locked`, active membership and `_participation_start` as
  a durable constraint every present and future grade path must honour, and the paired
  obligation on `_settlement_owed` is now an explicit rule rather than a lesson relearned.
- **pgTAP fixtures must now seed a line for any game they expect to be penalized.** Several
  existing fixtures graded games with no `game_lines` row at all — a shape that cannot occur
  in reality, since a locked pick is snapshotted _from_ a line. Making them realistic is a
  correctness improvement in its own right (#657 hit the same fixture unreality from the House
  side).
- The gate is evaluated per `(membership, game)` inside the missed pass. Volumes are small
  (a few leagues × a slate), and it matches how `_participation_start` is already called.
- A latent inconsistency is documented but deliberately untouched: the single-group `lock_pick`
  takes `p_source` as a caller argument (default `'fanduel'`) rather than reading
  `group_config`. The app calls `lock_pick_all_groups`, which resolves per-league, so the gate
  matches the real pick path; aligning `lock_pick` is out of scope here.

## Alternatives considered

- **Zero the penalty in `resolve_missed_penalty_for_game()`.** Rejected per decision 4: it
  still writes a `missed` row, so every downstream reader still sees a skipped pick. It also
  has no group context, while `line_source` is per-league config — the function would have to
  grow a parameter to answer the question correctly anyway.
- **Gate on `is_active_line` instead of `fetched_at`.** Rejected per decision 3: it asks a
  live question of a historical fact, its unique index is per game rather than per source, and
  a post-kickoff sync can move it.
- **Gate on `is_closing_line`.** Attractive because the ADR-0007 House guard already uses that
  exact predicate, and after `_capture_closing_line` runs the two sets are identical. Rejected
  because the flag is only ever written on the grade path (#735), so `_settlement_owed` — which
  must answer for _ungraded_ games — would report "not owed" for everything and the reconcile
  sweep would heal nothing.
- **Also exclude unlined games from the week's slate** (denominators, award eligibility,
  week-complete counts). Rejected per decision 6: materially wider surface, fuzzier boundary,
  and it overlaps #802. The narrow rule already removes the game from everything that scores.
- **Fix only the cause — make lines never go missing (#801).** Rejected as insufficient on its
  own: the rule is wrong regardless of how often it fires, and no sync-reliability work can
  guarantee a provider posts every game. Defence at the grading choke point is what makes the
  guarantee unconditional.
- **Filter the wrong rows out at read time.** Rejected for the same reason ADR-0037 rejected
  it: it leaves incorrect rows physically in `pick_settlement` and depends on every current and
  future reader remembering to exclude them. Gate at the write funnel; readers stay simple.

## Follow-up

- #803 — this change (the `_game_was_pickable` helper, the missed-pass gate, the
  `_settlement_owed` gate, pgTAP, type regeneration).
- ~~#802 — the client-side affordance: `canLock` / `canChange` never consult `spreadValue`, so
  an unlined game still renders as pickable and dead-ends at the server error. Complementary,
  not covered here.~~ **Shipped.** The picks board now gates both on a shared `hasLine`
  predicate and labels an unlined game as not-yet-posted instead of offering controls that
  cannot succeed. The server guard this ADR describes is unchanged — the client gate is
  defence in depth on top of it, never a replacement.
- #801 — why lines go missing for a newly-active week. Reduces how often this gate is load-
  bearing; does not replace it.
