# ADR-0036: Product principles rubric and pressure-test tooling

- Status: Accepted (2026-07-21)
- Date: 2026-07-16
- Issue: None — approved plan (product-principles layer); introduced with this PR
- Supersedes: None

## Context

Hotshot's "heart and direction" is real but **scattered** — it lives in `docs/DESIGN.md`'s
stance, `ROADMAP.md`'s boundary and guardrails, `AGENTS.md` §"What this is", and ~15 product
ADRs that are heart-decisions in disguise (ADR-0020 "catch-up is recognition, **not** a scoring
equalizer"; ADR-0023 All-In as a signature moment; ADR-0035 "the rating owns the market, badges
own the room"; ADR-0022 Over/Under deferred). Because it is nowhere in one place, the question
"is this feature a value-add or just noise, and is it on-brand?" gets re-argued from scratch every
time, and the answer drifts with whoever is arguing.

The **design layer already solved the analogous problem**: a governing doc (`DESIGN.md`), a
ratifying ADR (ADR-0030), a "study before you build" skill (`design-study`), and an "audit what
exists" skill (`design-review`). The product-judgment layer has no equivalent. This decision
creates a constraint intended to shape many future features — which is exactly the ADR trigger
test ("creates a constraint that will affect multiple future features") — so it is recorded here.

## Decision

Adopt [`docs/PRODUCT.md`](../PRODUCT.md) as the **canonical product-principles rubric**, and two
skills that operationalise it, mirroring the design layer one-for-one.

1. **`docs/PRODUCT.md`** crystallises the heart into a stance plus **seven lenses**, each a
   kill-question grounded in a real ADR or feature — **five judgment lenses** (value-vs-noise,
   on-brand/heart, right-for-~6-friends, strategic timing, lifetime cost/ops drag) that are
   weighed together, and **two gates** (fairness & integrity, reversibility) that are pass/fail.
   The value-vs-noise lens carries a **displacement corollary** (added by #695 before
   acceptance): on an already-dense surface the kill-question sharpens to _"what does this
   replace?"_ — a new element must name the block it displaces, or it waits. Density, not
   misfit, is how good surfaces die; "it's small" is not an answer.
2. **The gates restate existing law, they do not create it.** Fairness/scoring changes and
   costly-to-reverse changes already require an ADR under the `docs/adr/README.md` trigger test.
   The gates simply make that requirement fire at the _idea_ stage: a tripped gate escalates to
   `new-adr` before any build, rather than surfacing late in a PR.
3. **`pressure-test`** (forward) steelmans one idea, stress-tests it against the lenses, and
   returns a **Build / Reshape / Drop** verdict, handing survivors to `issue-author` (or `new-adr`
   first when a gate trips). Interactive, read-only, writes no file.
4. **`product-audit`** (backward) grades each shipped surface against the same lenses and writes a
   single keep/reshape/retire report to `docs/audits/`, following the `pattern-audit` model
   (read-only except the report; offers `issue-author` for the priority findings).

The rubric is **editable in one place**; a material change to it goes through ADR supersession,
exactly as `DESIGN.md` does.

## Consequences

- **Helpful:** one shared, grounded answer to "does this belong in Hotshot," reusable by humans
  and agents; bad ideas are killed or reshaped cheaply _before_ they become issues and code; the
  product's heart becomes explicit and tunable instead of tacit; the two layers (design, product)
  now read and govern the same way.
- **Harmful / cost:** another governing doc to keep current as the product evolves; product
  judgment is mostly **not mechanically checkable**, so — unlike the design layer's raw-hex guard —
  there is no CI enforcement, only the skills and review discipline; a rubric invites
  **over-application** (treating a quick UI tweak like a strategic bet) and **drift** (the doc
  lagging the ADRs it summarises). The skills mitigate the first by keeping `pressure-test` fast
  and scoped; the second is mitigated by grading against the doc and superseding it when wrong.

## Alternatives considered

- **Bake the rubric into the skills, no doc.** Rejected: the criteria would re-synthesise from
  scattered sources on every run, drift silently, and be untunable in one place — the exact
  problem this solves.
- **A doc but no ADR.** Rejected: it would leave the product layer governed differently from the
  design layer (which _is_ ADR-ratified), and the trigger test already calls for an ADR here.
- **One skill with prospective/retrospective modes.** Rejected: the forward gate (interactive,
  per-idea, no file) and the backward audit (fan-out, read-only, report) are genuinely different
  shapes, just as `design-study` and `design-review` are split.
- **Grade against generic product "best practices."** Rejected: generic advice produces noise for
  a private six-person app; the value is grading against _this_ product's documented heart.

## Follow-up

- Implementation of the `pressure-test` and `product-audit` skills ships with this PR.
- Consider a lightweight PR-template "pressure-test passed?" prompt for non-trivial features, the
  product analogue of the Design checklist gate — deferred until the rubric proves out.
- Re-run `product-audit` each offseason or roughly every ten feature PRs (the UI-re-audit cadence);
  its findings, and new product ADRs, are the signals that could revise this rubric.
