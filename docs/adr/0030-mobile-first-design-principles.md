# ADR-0030: Mobile-first design principles

- Status: Accepted
- Date: 2026-07-11
- Issue: No issue — approved plan (design-philosophy direction approved by Doug 2026-07-11)
- Supersedes: None

## Context

[ADR-0029](0029-design-system-token-architecture.md) (#530) landed the design-system
**token architecture** — a semantic vocabulary for colour, typography, spacing, elevation,
and motion, plus a `check-brand-colors` guard that fails raw hex / off-palette scales in
lint and CI. That layer answers "which token do I reach for". It does not answer "how do
these compose into a screen".

That second question keeps getting answered ad hoc, and the cost shows up as a steady
stream of reactive, one-at-a-time mobile-density fixes: the leaderboard "Total" column
clipping off-screen at 390px (the `fix/leaderboard-total-mobile-clip` branch, and the
same clip behind the `/league` consolidation in #529), and the `/stats` "More breakdowns"
nested double accordion — a second control (an accordion) for the very job the chip row
one card above already does. The convention "to switch between cuts of one dataset, use a
chip radiogroup" emerged independently in `/stats` "Every split" and `/league`, but was
never written down, which is exactly how the accordion drift happened.

A standing, citeable standard for the **interaction/composition layer** is needed on top
of the token layer.

## Decision

Adopt **mobile-first, dark-only** design principles as the standing interaction standard,
detailed in the living guide [`docs/DESIGN.md`](../DESIGN.md). It sits above, and defers
to, ADR-0029 for token values. Boundaries future work must preserve:

- **The mobile decision is the default decision.** Phone leads every layout; a desktop
  divergence must name the user, task, and viewport that justify it (admin is the one
  surface where desktop earns real attention). Nothing clips horizontally at 390px.
- **One pattern per job.** Switching between cuts of one dataset uses the chip radiogroup;
  progressive disclosure is at most **one level deep** (no drawer inside a drawer). Don't
  introduce a second control for a job an existing pattern already does.
- **Answer first, action clear.** Lead with synthesis; make the primary action dominant and
  keep consequential actions in thumb reach. Encode **state in form** (not text alone), and
  keep _selected / actionable / primary / status_ visually distinct rather than all
  collapsing into "gold".
- **Design the non-ideal states.** Loading, empty, error, and stale are first-class;
  interruption/recovery preserves committed-vs-uncommitted work; consequential actions give
  immediate feedback **and** durable confirmation (a PWA constraint,
  [ADR-0017](0017-client-data-cache.md)).
- **Hold the floors.** AA contrast on raised surfaces; accessibility survives interaction
  (focus, semantic roles, keyboard, reduced motion, non-colour cues); semantic colour stays
  separate from the `--primary` accent; `--ember` and slower motion are reserved for
  signature moments (All-In, The Whale, Hot Hand), not ordinary chrome.
- **Copy carries personality; controls carry clarity** — the Commissioner voice never
  obscures an action, status, deadline, or error.
- **Enforcement is proportional.** The `docs/DESIGN.md` hard-constraints checklist is a
  pre-merge gate for UI changes (carried in the PR template); the principles guide reviewer
  judgment. No new subjective design rules are pushed into CI — the one mechanical rule,
  raw hex / off-palette scales, is already guarded by ADR-0029's `check-brand-colors`.
- **`docs/DESIGN.md` is the living detail.** This ADR ratifies the stance; it is not
  rewritten as the guide evolves. A later reversal of the stance itself gets a superseding
  ADR.

Scope is intentionally a UI/interaction guide, not a re-statement of the token catalog
(that is ADR-0029 / `design-system.md`).

## Consequences

- **Helpful:** stops re-litigating the same 390px decisions; gives reviewers and agents a
  standard to cite; converges the app on one interaction vocabulary that complements the
  token vocabulary. Its first application removes the `/stats` nested accordion (design
  study: <https://claude.ai/code/artifact/8f5bdc55-e874-4483-94b6-dbb1c64677ee>).
- **Costs:** a checklist contributors must actually run; a living guide that needs upkeep
  as patterns evolve (drift risk if it isn't maintained); "one pattern per job" can feel
  constraining when a genuinely new surface needs a new pattern — mitigated by treating
  that as the trigger to run a `design-study` and add the pattern to the guide's vocabulary
  rather than inventing it ad hoc.

## Alternatives considered

- **Fold the principles into `design-system.md`.** Rejected: that pack is the token
  vocabulary (the "what"); mixing interaction/layout principles (the "how") into it blurs
  two layers. A short top-level guide that links to the pack keeps each single-purpose.
- **Keep fixing reactively, no written standard.** Rejected — that status quo is what
  produces the recurring density bugs.
- **A full design system / component catalog.** Rejected for now: heavier than a
  ~6-person app warrants; the guide can grow into it later.
- **Mobile-only (drop desktop guidance).** Rejected: admin is operated on a laptop, so
  desktop must stay usable — "considered", not "ignored".
- **Enforce broadly via CI/lint.** Rejected: design conformance is mostly not mechanically
  checkable; a PR-template checklist plus review is the right weight.

## Follow-up

- Add the `docs/DESIGN.md` hard-constraints checklist to the pull-request template.
- Wire references: the `AGENTS.md` reading list, `docs/agent-context/ui.md`, and
  `docs/agent-context/design-system.md` link to `docs/DESIGN.md`; add this ADR to the
  `docs/adr/README.md` index.
- First application — file a v3.2 issue to replace the `/stats` breakdown block's nested
  accordion with the chip selector (per the design study above).
