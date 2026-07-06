# ADR-0020: Catch-up mechanics — recognition, not a scoring equalizer

- Status: Accepted
- Date: 2026-07-06
- Issue: #109
- Supersedes: None

## Context

#109 asks whether to add a catch-up / comeback mechanic beyond the two already shipped
— drop-worst-week (ADR-0005 / ADR-0018, a season **floor**) and final-week unlimited
All-In (a season **ceiling**) — so a player who falls behind still feels in contention.
The issue floated four options: (A) status quo, (B) a percentile / points boost for
trailing players, (C) mulligan tokens (a new `mulligan_usage` table + RLS + UI), and
(D) a combination. The hard constraint is fairness: any mechanic must be defensible to
the whole ~6-person league and must never let a worse season beat a better one.

We validated the premise against the league's real history (prod group, seasons
2022–2025, all 18 weeks), because "someone gets buried early and quits" is an empirical
claim, not an axiom.

Findings:

- **Comebacks are already the norm, not the exception.** In 3 of the last 4 seasons the
  eventual champion trailed by 30–39 points at some point and did not lead until the
  final 1–5 weeks. In 2022 and 2023 the champion first took the lead in **week 18** (the
  final week). The week-13 (~70% mark) leader went on to _lose_ the title in 2 of 4
  seasons.
- **Worked examples.**
  - 2022 — **Frank: dead last (5th of 5), 28 points back at week 13 → finished 2nd.**
  - 2023 — **Colin: 3rd, 20 back at week 13 → champion.**
  - Counter-example, 2024 — **Michael Chestnut led from week 6 and won 116–18 (by 98).**
    A genuine, skill-driven runaway.
- **Variance already supplies the comeback engine.** A single week swings ≈12 points
  (1 SD), up to 25–50 in the tails. ~20 back is roughly one hot week; ~30 is recoverable
  over a month; only 70+ deficits reliably stayed dead — and only in blowout seasons.
- **Where players actually go dead is blowups, not close races.** 2025's last place
  finished −281 with a single −100 week (the unlimited-All-In finale). Those players
  were never title contenders under any catch-up rule; what they lacked was a _reason to
  keep picking each week_, not a shot at the crown.

## Decision

Adopt **Option A: add no catch-up scoring mechanic.** The existing symmetric levers —
the drop-worst-week floor and the final-week All-In ceiling — plus the format's natural
weekly variance already produce frequent, dramatic comebacks. We will not add a
trailing-player points / percentile boost (Option B) or mulligan tokens (Option C).

Rationale:

- **Redundant.** The data shows deficits of 20–30 are routinely erased and 30–39
  sometimes overturned for the title, with no extra mechanic.
- **Unfair in exactly the case it targets.** A points equalizer would have clawed back
  2024's deserved 98-point runaway — inverting skill, which is the fairness failure the
  issue explicitly warns against. When a gap _is_ insurmountable in this league, it is
  because someone earned it.
- **Exploitable / complex.** Option B rewards being behind (tanking pressure) and is
  lumpy at n≈6; Option C adds a persistent data model (table, RLS, UI, and a settlement
  interaction) and a new fairness surface — cost far exceeding the problem.

Engagement for genuinely buried players — the real goal behind "feel like you're not
out" — is met with **non-scoring recognition**, not points: season and weekly honor
badges (The Comeback, Week Winner, Best of the Rest, Cardiac) on the existing Awards
surface. These attach **zero points**, so they cannot move standings and cannot be gamed
by tanking (deliberately falling behind to later "climb" is strictly worse than simply
playing well, which wins the real title). They are tracked as a separate feature (#397)
and, because they add no scoring or fairness semantics, require no ADR of their own.

## Consequences

- No change to `pick_settlement`, any matview, `group_config.scoring_rules`, or grading.
  Nothing to migrate; standings math is untouched.
- #109 is resolved as "no scoring mechanic"; the engagement need is redirected to the
  honors feature (#397), which ships on the existing badge engine with no DB change.
- If a future season shows the format has genuinely stopped producing comebacks (e.g.
  repeated wire-to-wire blowouts), this can be revisited with a new ADR and fresh data —
  the decision is data-backed, not permanent doctrine.
- **Interaction order for any future mechanic.** Should a catch-up or multiplier rule
  ever be reconsidered (playoff-push weeks remain open in #107), it must reuse the
  season-scoped, **non-retroactive** predicate pattern established by ADR-0018
  (`enabled AND start_year set AND season_year >= start_year`), so it can never rewrite a
  completed season, and it must state its evaluation order relative to the
  drop-worst-week adjustment. Moot while Option A stands.

## Alternatives considered

- **Option B — trailing-player percentile / points boost.** Rewards being behind,
  pressures tanking, is lumpy at n≈6, and would have unfairly reversed the 2024 result.
  Rejected.
- **Option C — mulligan tokens.** A new `mulligan_usage` persistent model + RLS + UI +
  settlement interaction, for a problem the data says is largely self-solving. Rejected
  on cost and the added fairness surface.
- **Option D — combination.** Inherits both B's and C's problems. Rejected.
- **Non-scoring honors as the engagement answer.** Accepted, as a separate no-ADR
  feature (#397): it addresses "feel like you're not out" without touching any
  fairness / standings math.

## Amendment history

None.
