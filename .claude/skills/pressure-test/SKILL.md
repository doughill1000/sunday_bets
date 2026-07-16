---
name: pressure-test
description: Pressure-test a single product idea or decision before building it — steelman it, stress-test it against docs/PRODUCT.md's seven lenses (value-vs-noise, on-brand, right-for-~6-friends, timing, lifetime cost, plus the fairness and reversibility gates), and return a Build / Reshape / Drop verdict, handing survivors to issue-author (or new-adr first if a gate trips). Use when Doug asks "is this worth building?", "value-add or noise?", "is this on-brand?", "gut-check this feature", or wants to sanity-check a product decision before it becomes an issue. Read-only, interactive, writes no file. It does NOT author the issue (issue-author), scope an existing one (scope-issue), or audit what already shipped (product-audit).
---

# Pressure-test a product idea

Triggered when Doug points at a **new** idea or decision and wants to know whether it belongs in
Hotshot _before_ it becomes an issue — "is this a value-add or just noise?", "is this on-brand?",
"worth building?", "gut-check this." The output is a **verdict**, not code and not an issue. This
is the pre-issue filter: it slots _before_ `issue-author` in the pipeline. Canonical rubric:
[`docs/PRODUCT.md`](../../../docs/PRODUCT.md) (ratified by ADR-0036, the product twin of
`DESIGN.md` / ADR-0030).

The value is an **adversarial** test against the app's actual documented heart — not a generic
product opinion, and not a re-litigation of decisions the ADRs already settled.

## Steps

1. **Load the rubric.** Read [`docs/PRODUCT.md`](../../../docs/PRODUCT.md) — the stance and the
   seven lenses. Grade against the doc; pull a cited ADR (e.g. ADR-0020, ADR-0023, ADR-0035) only
   when a lens turns on it. Do **not** re-derive the heart from scratch.
2. **Ground the idea in real code first.** Never test in the abstract. Name the surface it touches
   (a route under `src/routes/(app)/`, a domain rule in `src/lib/domain/rules.ts`, a data model in
   `supabase/src/**`), what already exists to reuse, and what it would add. A grounded weak point
   beats an abstract worry.
3. **Steelman it.** State the idea at its strongest — the real user value, on the friendliest
   honest reading, in its best form. If you can't make a genuine case for it, say so; that is
   itself a finding.
4. **Stress-test the five judgment lenses.** Run value-vs-noise, on-brand/heart, right-for-~6-
   friends, strategic timing, and lifetime cost/ops drag. For each, name the honest weak point —
   try to _kill_ the idea, don't defend it. No single lens is decisive; weigh them together. If
   the idea lands on an already-dense surface, also run lens 1's **displacement corollary**:
   additions displace, they don't stack — the idea must name what it replaces.
5. **Check the two gates explicitly.** Fairness & integrity (could it corrupt pick-locking, reveal
   timing, or grading, or hand an edge?) and reversibility (a persistent data model, external
   dependency, or public surface that's costly to walk back?). A gate is **pass/fail**, not a
   score you can outweigh.
6. **Return a verdict:** **Build** (clears the lenses, trips no gate — worth its cost) /
   **Reshape** (intent is sound, form isn't — name the smaller, more on-brand version that
   survives) / **Drop** (doesn't earn its place, or a gate stops it — give the one deciding
   reason). Keep it tight; this is a filter, not a study.
7. **Hand off.** **Build** → offer `issue-author`, carrying the steelman and the lens notes into
   the issue's rationale and acceptance criteria. **Reshape** → `issue-author` on the reshaped
   version. **A tripped gate** → `new-adr` **before** any build (a fairness trip is often a hard
   Drop; reversibility raises the evidence bar). **Drop** → stop with the reason. Writes no file.

## Remember

- **Grade against `docs/PRODUCT.md`, not vibes.** A verdict without a lens anchor is just an
  opinion. If a lens has no basis in the doc, that gap is itself worth surfacing.
- **Don't re-litigate settled ADRs.** The heart-decisions (ADR-0020/0023/0035, etc.) are the
  rubric, not the debate — test _against_ them.
- **Gates escalate, they don't score.** Fairness or reversibility tripping means `new-adr`, not a
  lower number.
- **Stay fast and scoped.** This is a gut-check filter. A quick UI tweak does not need the full
  seven-lens treatment — say so and move on. Reserve the full pass for features and product bets.
- **Confirm before any GitHub write.** The handoff to `issue-author` runs its own flow; this skill
  itself creates nothing.

## See also

- [`docs/PRODUCT.md`](../../../docs/PRODUCT.md) (the rubric) and ADR-0036 (ratifies it)
- Sibling skills: `product-audit` (the backward twin — grade what already shipped), `issue-author`
  (turn a surviving idea into an issue), `new-adr` (when a gate trips), `scope-issue` (triage an
  issue that already exists), `design-study` (the design-layer equivalent for a UI surface)
