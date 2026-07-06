# ADR-0019: Configurable pick-reveal timing model and counts-only status carve-out

- Status: Accepted
- Date: 2026-07-06
- Issue: #383
- Supersedes: None

## Context

The app uses a sealed-envelope reveal: other members' picks are hidden until each
game's kickoff, and picks cannot be created or edited after kickoff. Reveal and lock
are welded to the same moment (`game_has_started()` = `now() >= commence_time`), which
structurally prevents copying. ADR-0009's context section documents this as an
existing constraint ("Sealed-envelope reveal") but does not itself decide reveal
timing; this ADR is the decision record for that boundary going forward. ADR-0009's
fan-out mechanics are unaffected.

The product question forcing this decision: should members ever see others' picks
before kickoff? The stated north star for the app is the social ritual around picks,
not the competition itself, which reopens the reveal-timing assumption. A concrete
consumer of a narrow widening of that boundary is already queued: issue #388 wants a
group-visible "who's picked" status board showing per-member counts (e.g. 9/13) for
the active week, pre-kickoff, with no game- or side-level detail. That is metadata
about _whether_ someone picked, not _what_ they picked, but it is still information
that does not exist under a strict reading of "sealed until kickoff," so it needs an
explicit carve-out rather than an ad hoc exception.

Decision drivers: fairness/integrity (no pre-lock pick must ever become visible, under
any mode, including via a mid-week admin mode flip); social value (pre-game visibility
is part of the stated product goal); the "better than a group chat" test (the app must
do something a plain group chat structurally cannot); configurability cost (branching
reveal timing multiplies RLS/view/UI surface and the fairness test matrix); and
reversibility (a pick that leaks once under the wrong mode permanently devalues the
sealed promise for that group).

This meets the ADR trigger test on two counts: it changes gameplay fairness (the
reveal boundary) and it establishes a cross-cutting pattern (a two-axis reveal/lock
model) that future features will build against.

## Decision

1. **Adopt a two-axis model (reveal time × lock time) as the conceptual boundary**,
   collapsed into three presets: **Sealed** (reveal at kickoff — today's behavior and
   the default), **Deadline** (picks lock at an earlier group deadline, then reveal;
   no copying because picks are already locked when revealed), and **Open** (picks
   visible as submitted). Sealed remains the only implemented mode for now; Deadline
   and Open are future work, not an immediate build.
2. **The enforceable invariant, regardless of mode or who changes it: no pick is ever
   exposed before it is locked.** Mode changes are non-retroactive — they apply going
   forward only; picks already submitted under Sealed stay sealed even if a group
   later switches modes. This mirrors the ADR-0018 non-retroactive pattern.
3. **One consumer product, one engine.** The crowdsource/Open-mode concept is a mode
   of Sunday Bets, not a spinoff product (Option C is rejected) unless it later targets
   strangers rather than known friend groups. A standalone app would start with zero
   picks and zero history, and history is the differentiating value.
4. **Records as a slice, not a scalar** (product direction, not an enforced boundary
   here): the differentiator is what each person is actually good at, segmented by
   team/matchup, bet type, favorite vs. dog, and recency, with honest sample-size
   handling. A single season W-L must not be presented as authority. This shapes
   future feature prioritization; it does not gate this ADR's Acceptance.
5. **Comments/reactions is flagged as the weakest surface** — the feature most
   redundant with a plain group chat. The moat is settling picks (records, grading,
   attribution), not chatting about them; investment should weight accordingly.
6. **Counts-only status carve-out (unblocks #388).** A group-scoped view/RPC that
   exposes, per group member for the active week, picks-made-vs-games-available
   (e.g. 9/13) and a submitted/pending indicator is **not** a reveal under any mode,
   including Sealed, and may be shown pre-kickoff. This carve-out is narrow and must
   hold structurally, not just by UI omission:
   - No game identity, side, team, or weight is derivable from the exposed shape —
     enforced at the view/RLS layer, not the client.
   - Scoped to members of the same group via `is_member(group_id)` (ADR-0002); a
     member of multiple groups sees a separate per-group roster.
   - `security_invoker = on` so the caller's own RLS on `picks` applies — the view
     adds no privilege the caller doesn't already have on the underlying rows it
     counts.
   - Proven by pgTAP: non-member denied; member sees counts only; no pick rows, no
     side/team/weight columns, regardless of kickoff status.
     This is the only reveal-adjacent exposure this ADR authorizes before Deadline/Open
     modes are built. It does not imply or authorize showing pick content, side, or game
     identity pre-kickoff.

**Explicitly deferred, not decided here:**

- **Mode granularity** for Deadline/Open — per-group identity ("we're a sealed group")
  vs. per-slate dial ("what are we feeling this weekend"). Revisit when either mode
  moves into active build; the choice affects where the mode setting lives (group
  config vs. per-slate row) and needs a sensible inherit-last-week default if per-slate.
- **Market fit** for an Open/crowdsource mode — conference-scoped CFB vs. broad NFL.
  A product decision independent of the reveal-timing mechanics; revisit alongside
  Open-mode scoping.

## Consequences

**Helpful:**

- Unblocks #388's counts-only status board without a standalone ADR, and gives future
  reveal-adjacent features (e.g. #395's nudge push) a documented boundary to cite
  instead of re-litigating the sealed promise each time.
- Keeps today's behavior (Sealed, default) completely unchanged for every existing
  group; nothing about current fairness guarantees moves until a group opts into a
  future mode.
- The non-retroactive invariant is the rollback safety net for Deadline/Open: a bad
  mode choice is contained to future slates, never rewrites what was already sealed.
- Single product/engine keeps history, grading, and leaderboard infrastructure shared
  rather than forked.

**Costs:**

- Building Deadline/Open modes later will multiply RLS/view/query/UI branches and the
  fairness test matrix (each mode needs pgTAP + integration coverage proving no
  pre-lock leak) — this ADR accepts that future cost without paying it now.
  Deferred granularity/market-fit decisions mean Deadline/Open cannot start
  implementation until a follow-up conversation resolves them.
- The counts-only carve-out is a precedent: every future "is this a reveal?" question
  will be measured against it, so its boundary (no game/side/team/weight, group-scoped,
  security-invoker) must be read narrowly and not extended by analogy without a new
  ADR note.

## Alternatives considered

- **Keep the current design (sealed-only), no carve-out (Option A, strict).** Simplest
  and already fully tested. Rejected as too narrow given #388 is queued and
  provably safe: exposing a count is not exposing a pick.
- **Standalone second product for crowdsource (Option C).** Rejected: forfeits shared
  history/grading/leaderboard infrastructure, which is the app's core differentiator;
  only reconsider if the audience becomes strangers rather than known friend groups.
- **Decide mode granularity and market fit now, before Accepting.** Rejected: neither
  choice is needed to authorize the #388 carve-out or to keep Sealed as the
  unconditional default; deciding them now would block this ADR on unrelated product
  questions that only matter once Deadline/Open implementation actually starts.
- **Give #388 its own standalone ADR instead of a carve-out here.** Rejected per the
  issue's own framing: the exposure is small enough to be a paragraph inside the
  governing reveal-timing ADR rather than a separate decision record.

## Follow-up

- #388 (who's-picked counts-only status board) — implementation may proceed once this
  ADR is Accepted; must satisfy the pgTAP proof obligations in Decision point 6.
- #395 (one-tap nudge push) — depends on #388; any reveal-adjacent surface it adds
  must be checked against this ADR's carve-out boundary, not assumed.
- Deadline/Open mode implementation — blocked on resolving mode granularity and
  market fit (see Explicitly deferred, above); track as a separate future issue when
  prioritized.
- ADR-0023 (#360, All-In signature moment) authorizes a **narrow extension** of this
  reveal boundary: a locked `weight='A'` (All-In) pick is shown to co-members
  pre-kickoff as a public declaration. That extension is scoped to All-In picks only;
  the sealed guarantee for every other weight (L/M/H) — and the counts-only carve-out in
  Decision point 6 — is unchanged.
