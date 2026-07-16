# Product principles

The living rubric for **what belongs in Hotshot**. It exists so the question "is this a
value-add or just noise, and is it on-brand?" stops being re-argued one feature at a time —
and so a new idea is tested against the app's actual heart instead of whatever felt exciting
that afternoon.

> **Draft — pending ratification.** This guide's standing decision is recorded in
> [ADR-0036](adr/0036-product-principles.md) (currently **Proposed**), mirroring how
> [ADR-0030](adr/0030-mobile-first-design-principles.md) ratifies [`docs/DESIGN.md`](DESIGN.md).
> Treat it as the working rubric now; treat it as law once ADR-0036 is Accepted.

**This is the product-judgment layer.** Where [`DESIGN.md`](DESIGN.md) governs _how a screen
is built_ and [`ROADMAP.md`](../ROADMAP.md) sets _release order_, this guide governs _whether a
feature should exist at all_. It is the product twin of the design layer: a governing doc, a
ratifying ADR, a "test it before you build" skill (`pressure-test`), and an "audit what exists"
skill (`product-audit`) — the exact shape design already has in `DESIGN.md` / ADR-0030 /
`design-study` / `design-review`.

Audience: humans and agents pressure-testing a **new** idea, or auditing an **existing** surface
for bloat or drift. The two skills operationalise this guide — read it before running either.

## The heart

Everything below is downstream of what Hotshot _is_:

- **A private NFL pick'em for ~6 friends.** Not a sportsbook, not a public contest, not a
  fantasy platform. The room is small, known, and casual. Features that assume strangers, scale,
  or seriousness the room doesn't have are usually wrong for it. (See `AGENTS.md` §"What this is".)
- **The group chat is the point.** The app exists to give six friends something to talk trash
  about on Sunday. The product's job is to _feed the conversation_ — the standings, the All-In
  call, the Whale title — not to replace it. Swagger lives mainly in the **copy** (the
  Commissioner's voice), not the furniture. (`DESIGN.md` §"The stance", principle 14.)
- **Competitive integrity over participation trophies.** The game is a real competition with a
  real winner. Recognition, catch-up, and side-games celebrate the room _without_ flattening the
  standings. ([ADR-0020](adr/0020-catch-up-mechanics.md): catch-up is "recognition, **not** a
  scoring equalizer".)
- **Signature moments earn their weight through restraint.** All-In, The Whale, a live streak,
  the Wrapped champion reveal land _because_ the rest of the app is quiet premium — charcoal and
  gold, the data leading. Spend the ember sparingly or it stops meaning anything.
  ([ADR-0023](adr/0023-all-in-signature-moment.md); `DESIGN.md` §"The stance", principle 13.)
- **The arc is single-group → multi-group.** The defining product boundary — and the current
  direction — is moving from the one original group to self-service groups. An idea's timing is
  measured against that arc, not against a wishlist. (`ROADMAP.md` §"Release direction".)
- **Infrastructure is earned by measurement, not by ambition.** Scale, caching, and new pipelines
  are revisited when a metric crosses a threshold — not because a feature would be cool at scale.
  The same discipline applies to product: cost is real and the room is small.
  (`ROADMAP.md` §"Architectural guardrails".)

## The verdict vocabulary

`pressure-test` resolves every idea to one of three words. Use them literally:

- **Build** — it clears the lenses and trips no gate; the strongest honest version is worth the
  cost. Hand off to `issue-author`.
- **Reshape** — the intent is sound but the proposed form isn't; there's a smaller, more on-brand
  version that survives. Name that version; hand _it_ off.
- **Drop** — it doesn't earn its place, or a gate stops it. Say the one deciding reason.

## The lenses

Each lens is a **kill-question** (try to fail the idea on it), a reason, and a real example. Five
are **judgment lenses** — always weighed, no single one is decisive. Two are **gates** — pass/fail,
and a trip escalates rather than just lowering a score.

### Judgment lenses

**1. Value-add vs noise.** _"Would we demo this once and never miss it?"_
An idea has to earn the complexity it adds — every surface is one more thing to learn, maintain,
and keep on-brand. The strongest features draw a clean line between the serious and the fun so
neither dilutes the other.
_Why:_ noise is the default failure mode of a small app that keeps saying yes.
_Example:_ [ADR-0035](adr/0035-badge-boundary-rule.md) keeps the credibility rating (the serious,
market-anchored stat) and badges (the room's fun) in separate lanes so neither becomes clutter;
[ADR-0022](adr/0022-over-under-totals-market.md) **deferred** the Over/Under market rather than
bolt on a second market that wasn't yet worth its weight.

**2. On-brand / heart.** _"Does this sound and feel like Hotshot — confident, a little swagger,
the Commissioner's voice — without cheapening the signature moments?"_
The identity is charcoal-and-gold quiet premium with personality in the copy; the moments that
get the ember treatment are rare on purpose.
_Why:_ every off-key feature makes the next one easier to justify, and the signature moments dim.
_Example:_ [ADR-0027](adr/0027-rebrand-sunday-bets-to-hotshot.md) deliberately **de-gambled** the
name and evolved the identity; `DESIGN.md` principle 14 puts personality in copy and clarity in
controls — a feature that needs a gimmick to feel fun is usually off-heart.

**3. Right for ~6 friends.** _"Does this assume a scale, seriousness, or stranger-audience the
room doesn't have?"_
Hotshot is a known, private, casual room. Anti-abuse machinery, public-facing polish, and
"engagement" systems designed for thousands are usually solving a problem six friends don't have.
_Why:_ building for an imagined audience adds cost and ceremony the real audience never uses.
_Example:_ tenancy was built group-aware from the start ([ADR-0002](adr/0002-group-tenancy-boundary.md))
_without_ prematurely building the moderation and scale apparatus a public product would need —
the model is ready, the machinery is deferred until a real group needs it.

**4. Strategic timing.** _"Right thing now, or a distraction from the current arc?"_
A good idea at the wrong time is still a wrong build. The current arc is the on-ramp to
self-service groups (onboarding → create/join/invite/switch); work that pulls focus off it needs
a strong reason.
_Why:_ a small team ships the arc or ships the tangent, rarely both.
_Example:_ `ROADMAP.md` sequences v1.9 onboarding + a regression net **before** v2.0 self-service
groups on purpose — the net lands first so the access-path refactor has something to catch it.

**5. Lifetime cost / ops drag.** _"What does this cost forever — a cron, odds-API quota, a
matview, ongoing maintenance — and is the value worth that tail?"_
Judge value _net of_ the recurring cost it creates, not just the build effort. New pipelines,
external calls, and background jobs are a standing tax.
_Why:_ the room is small and the ops budget is a person's spare time; every cron is watched.
_Example:_ leaderboard stats are served from materialized views refreshed on grading
([ADR-0013](adr/0013-materialized-leaderboard-stats.md)) rather than recomputed per request, and
the odds-API draw is quota-capped and monitored (`season-ops`) — cost is a first-class design
input, not an afterthought.

### Gates

A gate is not a score you can outweigh. If an idea trips one, it **stops** here until the gate is
resolved — and resolving it means writing the ADR, not arguing past it.

**6. Fairness & integrity.** _"Could this corrupt pick-locking, reveal timing, or grading — or
hand someone an edge?"_
The game is only worth playing if it's fair. Picks lock at kickoff, reveals are timed, grading is
deterministic and auditable, and catch-up recognises without equalising.
_Trip → run [`new-adr`](../.claude/skills/new-adr/SKILL.md)_; often a hard **Drop**. This gate is
already repo law — the ADR trigger test requires an ADR for any gameplay-fairness or scoring
change. The lens just makes it fire at the idea stage instead of the PR.
_Grounding:_ [ADR-0019](adr/0019-pick-reveal-timing-model.md) (reveal timing),
[ADR-0023](adr/0023-all-in-signature-moment.md) (All-In pre-kickoff carve-out),
[ADR-0024](adr/0024-grading-integrity-membership-penalty-and-frozen-seasons.md) (grading
integrity), [ADR-0020](adr/0020-catch-up-mechanics.md) (recognition, not equalisation), and
`src/lib/domain/rules.ts` (kickoff lock, All-In once per week).

**7. Reversibility.** _"Is this a one-way door — a persistent data model, an external dependency,
a public surface — that's costly to walk back?"_
Reversible bets can be tried cheaply; irreversible ones must clear a higher bar and usually an ADR.
_Trip → run [`new-adr`](../.claude/skills/new-adr/SKILL.md)_ and raise the evidence bar before
Build. This mirrors the ADR trigger test's "costly, risky, or operationally difficult to reverse."
_Grounding:_ persistent data models ([ADR-0002](adr/0002-group-tenancy-boundary.md)), external
services and public surfaces ([ADR-0026](adr/0026-public-demo-season-snapshot.md)) are the classic
one-way doors — a throwaway UI tweak is not.

## How to use this

- **Before building** a new feature or making a product decision, run the **`pressure-test`**
  skill: it steelmans the idea, stress-tests it against the lenses above, checks both gates, and
  returns a **Build / Reshape / Drop** verdict — then hands survivors to `issue-author` (or
  `new-adr` first when a gate trips).
- **To audit what already exists**, run the **`product-audit`** skill: it grades each shipped
  surface (picks/All-In, `/league`, `/market`, `/stats`, `/wrapped`, badges, credibility rating,
  catch-up, notifications, `/demo`, feedback) against these same lenses and writes a
  keep/reshape/retire report to `docs/audits/`. Re-run it each offseason or roughly every ten
  feature PRs, the same cadence as the UI consistency re-audit.
- **This rubric is editable.** When a decision here proves wrong, change the tenet — in one place —
  rather than letting the skills drift. Material changes to a ratified rubric go through an ADR
  supersession, exactly like `DESIGN.md`.

## Related

- [ADR-0036](adr/0036-product-principles.md) — ratifies this guide as the standing
  product-principles decision (Proposed).
- [`docs/DESIGN.md`](DESIGN.md) / [ADR-0030](adr/0030-mobile-first-design-principles.md) — the
  design-layer twin this guide is modelled on.
- [`ROADMAP.md`](../ROADMAP.md) — release direction and the architectural guardrails several tenets
  draw on.
- [`docs/adr/README.md`](adr/README.md) — the ADR trigger test that gates 6 and 7 formalise.
- The product ADRs this guide crystallises: [0020](adr/0020-catch-up-mechanics.md),
  [0022](adr/0022-over-under-totals-market.md), [0023](adr/0023-all-in-signature-moment.md),
  [0024](adr/0024-grading-integrity-membership-penalty-and-frozen-seasons.md),
  [0027](adr/0027-rebrand-sunday-bets-to-hotshot.md), [0035](adr/0035-badge-boundary-rule.md).
