# ADR-0023: All-In as a signature moment — pre-kickoff declaration carve-out and The Whale title

- Status: Accepted
- Date: 2026-07-06
- Issue: #360
- Supersedes: None (extends ADR-0019)

## Context

#360 graduates item 4 of the engagement epic (#229): elevate the **All-In** from
"just the highest weight" into a public, on-the-record **moment**. The mechanics it
builds on already exist — pick weights L/M/H/A = 1/3/5/10 (`weight_points`), the
per-week All-In cap enforced in `lock_pick` (one `weight='A'` pick per player per week
per group), and the `final_week_unlimited_allin` setting (made configurable in #76,
surfaced in the picks UI in #222). The retention thesis (per #229): the All-In is the
league's natural **lore** generator — legendary calls and legendary chokes — and today
none of that is surfaced in-app before the result is known.

The decision this forces is a **reveal-boundary** one, not a scoring one. ADR-0019
(Accepted 2026-07-06) established the sealed-envelope model: a member sees another
member's pick only at kickoff, enforced by the `sel_picks_owner_or_started` RLS policy
on `public.picks` (`is_member(group_id) AND (own OR game_has_started(game_id))`). ADR-0019
also drew an explicit line around its counts-only carve-out: it "does not imply or
authorize showing pick content, side, or game identity pre-kickoff." A public All-In
**declaration** that shows the group the game, side, and weight before kickoff is
precisely the thing ADR-0019 said it was _not_ authorizing. It therefore cannot be built
under ADR-0019 as written — it needs an explicit, narrow extension of that boundary,
which is this ADR.

Two design questions were settled with the product owner before writing:

- **Scarcity.** #360 originally scoped a "season scarcity — limited number of All-Ins
  per season." This is **dropped.** The existing one-per-week cap already rations the
  All-In to a single meaningful choice each week (≈17–18 per season); a second per-season
  budget would add a persistent counter, a new fairness surface, and UI to ration
  something already rationed. The **weekly cadence is the scarcity**; `final_week_unlimited_allin`
  is unchanged.
- **Declaration shape.** The declaration is a **full reveal** (game + side/team + weight),
  shown **automatically** the moment the All-In is locked (there is no private All-In),
  and visible **immediately** rather than held to a pre-kickoff cutoff.

Decision drivers: fairness/integrity (the sealed promise for the rest of the board must
not weaken, and the carve-out must hold structurally, not by UI omission); social/lore
value (an on-the-record call is the entire point); the "better than a group chat" test;
blast radius and reversibility (a reveal surface that exposes the wrong rows permanently
devalues the sealed promise for that group); and determinism (the Whale award must be
reproducible, like every other badge).

This meets the ADR trigger test on two counts: it changes gameplay fairness (the reveal
boundary) and it extends a cross-cutting pattern (ADR-0019's reveal/lock model).

## Decision

1. **Extend the reveal boundary for `weight='A'` picks only.** A locked All-In pick
   becomes visible to co-members of the same group **immediately on lock, pre-kickoff** —
   including game, side/team, weight, and `locked_at`. This is a deliberate, narrow
   widening of ADR-0019's sealed-envelope reveal, authorized here and nowhere else. Every
   other weight (L/M/H) stays sealed until kickoff exactly as today.

2. **The sealed invariant is preserved for all non-All-In picks.** No L/M/H pick is ever
   exposed before kickoff; the `sel_picks_owner_or_started` guarantee for non-All-In reads
   is not loosened, and ADR-0019 Decision point 2 ("no pick is ever exposed before it is
   locked") is unchanged — an All-In is exposed only _after_ it is locked, never before.
   The carve-out must hold structurally at the data layer, not by client omission.

3. **Declaration is automatic; it tracks the current locked All-In.** Locking a
   `weight='A'` pick _is_ the declaration — there is no opt-in gesture and no private
   All-In. The existing pre-kickoff freedom to clear or move the week's All-In is retained;
   the declaration always reflects the currently locked All-In, and withdrawing it before
   kickoff withdraws the declaration. After kickoff, normal lock rules apply.

4. **Accepted fairness tradeoff.** Revealing the side lets co-members fade or copy that
   single pick, and the earliest locker reveals information first (a late locker may wait
   to see others' calls before committing). This is **accepted**: it is the player's own
   highest-risk pick, the group is a handful of known friends, it is at most one pick per
   player per week, and the on-the-record drama is the feature's whole purpose. It extends
   to no other pick or weight.

5. **Enforcement primitive: a membership-checked, weight-scoped surface that leaves
   base-table RLS untouched.** The declarations reveal is delivered through a dedicated
   surface — a `security definer` function/view that checks `is_member(group_id)` and
   returns only `weight='A'` locked rows for the caller's group — so **no other reader of
   `public.picks` gains new visibility** and the non-All-In sealed guarantee is structurally
   unchanged. (If a `security_invoker` view is preferred for house-style consistency with
   `picks_group_view`, it instead requires a scoped base-RLS `SELECT` policy limited to
   `weight='A'` plus an audit of every `picks` reader; the **boundary**, not the primitive,
   is what this ADR fixes.) The boundary is proven by pgTAP:
   - a co-member sees another member's **locked All-In** for a not-yet-started game;
   - a co-member does **not** see another member's L/M/H pick pre-kickoff;
   - a non-member sees nothing;
   - no All-In row is exposed before it is locked.

6. **The Whale is a non-scoring, deterministic season title.** One holder per season:
   the **best All-In win rate** above a minimum-sample guard — the high-roller who goes
   big and cashes, the positive mirror of _The Choker_ (worst All-In rate). It attaches **zero points** and cannot move standings
   (consistent with ADR-0020's recognition-not-scoring stance). It is computed in the
   existing pure badge engine (`src/lib/domain/badges.ts`) from the `stats_accuracy_by_weight`
   view (`weight='A'` rows already feed The Choker and Big Game Hunter) — **no new matview,
   no trigger, no DB write.** Because every All-In is now declared, "calls it and backs it
   up" is exactly the best record on the picks the whole group watched.

7. **No scoring or weight-semantics change.** `weight_points`, the per-week All-In cap in
   `lock_pick`, and `final_week_unlimited_allin` are all unchanged; standings math is
   untouched. The signature-moment feature is **reveal + recognition**, not a scoring
   change — this narrows #360's original "changes scoring weight semantics" framing.

**Explicitly out of scope / deferred:**

- **Season-scarcity budget** — dropped (see Context); revisitable only with a new ADR and
  real usage data if the weekly cadence proves too loose.
- **AI hype/roast of All-In calls** — lives in the AI commentator epic (#283), not here;
  #189 may later override The Whale's flavor copy.
- **A push notification for a declaration** — a reveal-adjacent nudge that must be measured
  against this carve-out (per ADR-0019's #395 note) before it is built; not built here.
- **Money / wagering** — out of scope for the whole #229 epic.

## Consequences

**Helpful:**

- Delivers the on-the-record moment (#229 item 4) with **zero added player effort** —
  locking an All-In already exists; it simply becomes public.
- The reveal is confined to `weight='A'` behind a single membership-checked surface, so the
  sealed guarantee for the rest of the board is structurally untouched and independently
  testable.
- The Whale title reuses the existing badge engine and `stats_accuracy_by_weight` — no
  new matview, no trigger, no scoring or standings change, fully deterministic.
- Dropping the season-scarcity budget avoids a persistent counter, a new fairness surface,
  and UI to ration what the weekly cap already rations; `lock_pick` and grading are
  unchanged.

**Costs:**

- This ADR widens the reveal boundary ADR-0019 deliberately drew, so it becomes the
  precedent every future "can we show X pre-kickoff?" will cite. It must be read **narrowly**:
  `weight='A'` only, group-scoped, on its own surface, with no base-RLS loosening.
- The carve-out adds a fairness test-matrix obligation (pgTAP proving All-In visible /
  non-All-In sealed / non-member blocked / nothing-before-lock) that must ship with the
  implementation PR.
- It accepts a mild strategic asymmetry (late lockers can see earlier All-In calls) as the
  price of the drama.
- A second reveal surface (declarations) alongside `picks_group_view` means two read paths
  that must each honor the sealed guarantee.

## Alternatives considered

- **Commitment-only declaration** ("X declared an All-In" with no game/side). Fits inside
  ADR-0019's counts precedent with no new carve-out, but forfeits the specific bet to brag
  about or choke on until kickoff — the weakest form of the lore payoff. Rejected in favor
  of a full reveal.
- **Opt-in "call your shot" gesture** (All-In stays sealed unless explicitly declared).
  More player control, but adds UI/state and lets the highest-risk pick hide from the lore
  the feature exists to create. Rejected — declaration is automatic.
- **Keep the season-scarcity budget** from the original #360 scope. Adds a persistent
  per-season counter, a fairness surface, and UI to ration something the one-per-week cap
  already rations. Rejected; the weekly cadence is the scarcity.
- **The Whale as a milestone** (anyone who wins a declared All-In) **or a volume title**
  (most All-In wins). The milestone overlaps _Big Game Hunter_ (won 3+ All-Ins); the volume
  title rewards frequency over conviction. Rejected in favor of a best-rate title — the
  clean positive mirror of _The Choker_.
- **Widen base-table RLS globally for `weight='A'`** instead of a confined surface. Simpler,
  but every `picks` reader inherits the new visibility and must be re-audited, and a future
  reader could leak more than intended. Rejected in favor of a single, membership-checked,
  weight-scoped surface.

## Follow-up

- **#360 implementation PR** — may proceed once this ADR is Accepted. Must satisfy the
  pgTAP boundary proofs in Decision point 5 and add The Whale title to the badge engine
  (`src/lib/domain/badges.ts`, `src/lib/types/honors.ts`, glossary) and a declarations
  surface + UI under `src/lib/components/picks/`.
- **ADR-0019** — a Follow-up note is added there pointing to this ADR as the authorized
  `weight='A'` extension of the reveal boundary; the sealed guarantee for all other weights
  is unchanged.
- **#283 / #189** — the AI layer may later voice declarations and override The Whale's
  flavor copy.
- Reconsider a season-scarcity budget only with a new ADR and real usage data.

## Amendment history

None.
