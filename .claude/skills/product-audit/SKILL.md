---
name: product-audit
description: Audit what already shipped for product value and on-brand fit — fan out a subagent per product surface (picks/All-In, /league, /market, /stats, /wrapped, badges, credibility rating, catch-up, notifications, /demo, feedback), grade each against docs/PRODUCT.md's seven lenses, and write one keep/reshape/retire report to docs/audits/. Use when Doug asks to "audit the product for bloat", "what's just noise", "is anything off-brand", or "run the pressure test on what exists" — periodically, each offseason or ~every ten feature PRs. Read-only except the report; offers issue-author for the priority findings. It is the backward twin of pressure-test (one new idea) and complements pattern-audit (code patterns, not product value).
---

# Product audit

The backward twin of `pressure-test`: instead of testing one new idea, it grades **what already
exists** against the same rubric, surfacing features that became noise, drifted off-brand, or
outgrew a private six-person room. Eyeballing the whole app at once, or grading against generic
product advice, produces noise — the value is **parallel per-surface grading against the app's own
documented heart** in [`docs/PRODUCT.md`](../../../docs/PRODUCT.md) (ADR-0036). The output is one
report file — **read-only otherwise**. This mirrors the `pattern-audit` model, but grades product
value/heart rather than code patterns, and grades against `PRODUCT.md` rather than the code docs.

## Steps

1. **Preflight (orchestrator).** Read [`docs/PRODUCT.md`](../../../docs/PRODUCT.md) (the rubric)
   and [`ROADMAP.md`](../../../ROADMAP.md) (the current arc — the strategic-timing lens needs it).
   Note today's date for the report filename. If the working tree is dirty with unrelated changes,
   mention it — the audit reads HEAD as-is.

2. **Fan out one subagent per product surface, in parallel** (single message, multiple Agent
   calls). Use `subagent_type: Explore`, `model: sonnet`. Give each subagent exactly: its
   route/component scope, the seven lenses, and the grade-block schema. Tell each to read
   `docs/PRODUCT.md` **first**, then the surface, and to cite `route`/`component` evidence for
   every finding. The surfaces below are the starting map — reconcile against the **current** route
   list under `src/routes/(app)/` and drop or add lanes to match what actually ships:

   - **Picks board + All-In** (`src/routes/(app)/` picks, `src/lib/domain/rules.ts`, ADR-0023)
   - **/league** (standings + weekly)
   - **/market** (the NFL slice explorer, #529)
   - **/stats** (splits, breakdowns, credibility hero)
   - **/wrapped** (season recap)
   - **Badges** (ADR-0035 — "the room")
   - **Credibility rating** (ADR-0032 — "the market")
   - **Catch-up mechanics** (ADR-0020)
   - **Notifications & preferences** (push + per-player prefs)
   - **/demo** (public snapshot, ADR-0026)
   - **Feedback** (ADR-0028)

3. **Collect** each subagent's grade block **verbatim** — do not re-grade or soften a verdict. If a
   block is malformed or missing evidence, send the subagent back rather than papering over it.

4. **Synthesize (orchestrator).** Assemble the report:
   - A **scorecard table** (surface → Keep / Reshape / Retire → one-line justification).
   - An **executive summary**: 3–5 cross-cutting themes (e.g. "two surfaces do the same job",
     "engagement machinery built for a scale six friends don't have"). This is the "what's noise"
     answer.
   - A **single prioritized list** (P0→P3) of retire/reshape recommendations, each naming the
     surface and `route`/`component` evidence.
   - The full per-surface grade blocks underneath, in surface order.

5. **Write** the report to `docs/audits/YYYY-MM-DD-product-audit.md` (create `docs/audits/` if
   absent). **Do not commit, push, or file issues.** Tell Doug the path, lead with the scorecard
   and the top 3 recommendations, and offer `issue-author` to file the priority findings (which
   runs its own flow).

## Grade block schema

Each subagent returns exactly this, and nothing else:

```
### <Surface> — Verdict: <Keep | Reshape | Retire>
**Justification:** <one line tying the verdict to the lenses>
**Lens read:**
- Value vs noise: <does it earn its complexity?> — `route`/`component`
- On-brand / heart: <does it sound and feel like Hotshot?>
- Right for ~6 friends: <does it assume scale/seriousness the room lacks?>
- Strategic timing: <does it serve or distract from the current arc?>
- Lifetime cost / ops drag: <what does it cost to keep running?>
- Gates (fairness / reversibility): <flag only if this surface created an integrity or one-way-door problem; usually N/A for shipped surfaces>
**Recommendation:** [P0|P1|P2|P3] <keep as-is / the specific reshape / retire and what replaces it>
```

## Remember

- **Grade against `docs/PRODUCT.md`, not generic advice.** A finding without a lens anchor is an
  opinion — drop it or reframe it.
- **Read-only except the report.** Never commit, push, or file issues; writing the report to
  `docs/audits/` is the only mutation. Whether to commit it is Doug's call.
- **Don't soften subagent verdicts.** Carry grade blocks verbatim; synthesis adds the cross-cutting
  view, it doesn't overrule a lane.
- **Gates rarely apply to shipped surfaces** — flag only when a surface itself created a fairness or
  irreversibility problem; the judgment lenses carry most of this audit.
- **Approval gate.** If the report motivates issues, hand off to `issue-author` — do not write to
  GitHub from this skill.

## See also

- [`docs/PRODUCT.md`](../../../docs/PRODUCT.md) (the rubric) and ADR-0036 (ratifies it)
- Sibling skills: `pressure-test` (the forward twin — test one new idea), `pattern-audit` (grade
  code patterns, same read-only/report discipline), `design-review` (UI critique of a shipped
  screen), `issue-author` (turn a finding into an issue)
