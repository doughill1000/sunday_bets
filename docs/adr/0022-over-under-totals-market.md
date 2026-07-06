# ADR-0022: Over/Under (totals) as a pick market — deferred; per-group season mode if built

- Status: Accepted
- Date: 2026-07-06
- Issue: #400
- Supersedes: None

## Context

Sunday Bets is a spread-only, confidence-weighted ATS pick'em: each game yields exactly
one pick — a spread side carrying an L/M/H/All-In weight — and every standings surface
(weekly and season leaderboards, streaks, head-to-head, Wrapped) reads the
`points_delta` / `outcome` contract settled into `pick_settlement`. #400 asks, as a
`type:decision`, whether to add **over/under (totals)** as a pick option before the 2026
kickoff (~Sep 10), and in what shape.

The engagement case is genuine: a second thing to be right about, plus strategic texture
on games where the spread is dull but the total is live. The integration case is bounded
but not free — new `market` / `over-under` enums (Postgres enums are effectively
append-only), relaxing NOT NULLs and adding a mutually-exclusive CHECK on the live
`picks` table, LEFT-joining every pick-reading view so null-team totals picks are not
silently dropped, a `grade_total_pick` branch, and adding `totals` to the odds sync
(~2× The Odds API quota, still within the 500/mo cap). Roughly four PRs. It also competes
for the pre-kickoff slot against the Sunday-live (v2.11) and history (v2.12) milestones,
both of which sit closer to the core weekly ritual.

A constraint surfaced during the decision discussion that narrows the shape more than
#400's original framing did: **head-to-head comparison and per-player market choice are
mutually exclusive.** Head-to-head means everyone answered the same question on a game;
the instant one player bets the Over while another bets the spread on that game, there is
no head-to-head between them there. Preserving the "we all picked the same games, who
won" identity therefore forbids letting the _individual_ choose the market. The market
must be a **collective** setting decided at or above the group level — which also means
"some players would prefer totals" can only be honored by letting a group _play_ a totals
season, never by mixing markets inside one league.

## Decision

**Defer. Do not build the over/under market for the 2026 season; spread-only stands.**

This is _not now_, not _never_. The mechanics generalize cleanly and the engagement
upside is plausible, but two things gate a yes and neither is met: there is **no
identified group asking to play totals**, and the pre-kickoff slot is more valuable spent
on Sunday-live and history, which deepen the loop every existing league already plays.
Adding speculative surface to the live `picks` table for a mode nobody has asked to
switch into is not justified now.

**If totals are ever built, they take one shape — per-group, season-long game mode — and
no other.** This is the durable boundary a future ADR and epic must inherit:

- A group is a **spread league or a totals league**, chosen once (preseason) and stored
  as a group-level mode setting defaulting to `spread`, following the
  commissioner-setting and non-retroactive discipline of ADR-0018 (a mode change must
  never rewrite a settled season). Totals are **not** a per-pick attribute selected
  game-by-game.
- **One pick per game, one leaderboard, the unchanged `points_delta` / `outcome`
  contract.** Totals reuse the existing weight / All-In / missed-pick-penalty /
  settlement machinery rather than adding a parallel scoring track or a second board.
- Because a league is never mixed, this preserves head-to-head perfectly and dissolves
  most of #400's open product questions: the four-button pick-card problem and any
  per-week "mixing limit" simply do not arise.

## Consequences

- **Nothing changes now.** No schema, enum, view, grading, or odds-sync change; `picks`
  and every matview are untouched. There is nothing to migrate and nothing to reverse —
  the market is dark by omission, not by a disabled flag.
- **#400 resolves as "deferred with a decided shape,"** and this ADR is the durable
  record of _why not now_ and _what shape if later_, so next preseason does not
  re-litigate it from scratch — or re-propose per-pick market choice, which the
  head-to-head constraint rules out.
- **The narrowing is the real value even while deferred.** The collective-market
  constraint and the per-group-season-mode shape are now written down, so a future build
  starts from the correct boundary instead of re-deriving it.
- **The eventual build still needs its own Proposed ADR.** It touches schema, grading,
  RLS/grants, and pgTAP — squarely inside the ADR trigger test — so this decision governs
  the _shape_, not the implementation.

## Alternatives considered

- **Build now, per-group season mode.** The chosen shape _if_ we build — deferred purely
  on demand and timing, not on design. A revisit trigger, not a rejected option.
- **Per-pick market attribute (#400 Option A).** Each player picks spread or total per
  game. Rejected: it breaks head-to-head by construction and forces confusing four-market
  pick cards plus a "mixing limit" rule to keep the board comparable.
- **Second pick per game — spread _and_ total (#400 Option B).** Rejected: doubles the
  scoring surface, inflates weekly points, shifts leaderboard scale, breaks historical
  comparability, and needs a picks primary-key change plus a settlement migration.
- **Per-game market designation.** The commissioner marks each game spread or total.
  Preserves head-to-head and adds week-to-week variety, but adds a real new burden ("who
  decides game 7 is a totals game, and why?") and lock-time rules — a possible _v2 of a
  totals mode_, not a v1 shape.
- **Separate "for fun" / non-scoring totals track, or dual parallel leaderboards.**
  Rejected: a side game that does not count gets ignored and fails the very player who
  would prefer totals, while a second board roughly doubles UI and stat surface and the
  weekly pick chore, forfeiting the reuse that makes the integrated shape attractive.

## Follow-up

Revisit — opening a fresh **Proposed** ADR for the implementation — if any of these hold:

- a group explicitly asks to play a totals league (the missing demand signal that gates
  the go decision);
- spread-only engagement flags in a way totals plausibly addresses; or
- Sunday-live (v2.11) and history (v2.12) ship and a pre-season slot opens with no
  higher-value contender.

Any such revisit inherits the **per-group, season-long mode** shape and the
head-to-head / collective-market constraint recorded here. Non-goals carried forward from
#400: totals consensus/badges, Expo companion parity (stays spread-only via defaulted RPC
params), and historical seasons (spread-only by construction).
