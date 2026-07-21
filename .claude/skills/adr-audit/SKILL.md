---
name: adr-audit
description: Audit the ADR corpus itself for drift — fan out a subagent per ADR cluster, verify each accepted decision against what the code actually does now, and return one KEEP/AMEND/SUPERSEDE/RATIFY/RETIRE verdict per ADR plus a hunt for decisions already made that have no governing ADR. Use when Doug asks to "review the ADRs", "are any ADRs stale", "should we revisit any decisions", or before a season launch. Read-only except the report in docs/audits/. It is the governance twin of pattern-audit (code vs standards) and product-audit (features vs heart) — this one grades the standards themselves.
---

# ADR audit

Every other audit in this repo treats the ADRs as the **yardstick**. `pattern-audit` grades
code against them; `product-audit` grades features against `PRODUCT.md`; `db-pr-review`
grades SQL against ADR-0011. Nothing grades **the ADRs themselves**, so when a record goes
stale it stays stale — and every downstream audit then measures against a bad ruler.

This skill is that missing pass. It asks one question of each ADR: **is this record still
true?**

## The two failure modes it exists to catch

1. **A record describing shipped work as pending.** ADR-0032 listed the `/league`
   credibility ladder as "a Wave-2 follow-up (blocked on #361)" for six weeks after it
   shipped. Harmless-looking, but an agent reading it plans work that already exists.
2. **A record contradicting reality.** ADR-0030's Decision said "dark-only" while the guide
   it ratifies said "two themes" — inside a pass/fail merge gate.

Neither is a _wrong decision_. Both are bookkeeping. Expect most findings to be this shape.

## Steps

1. **Preflight (orchestrator).** Read `docs/adr/README.md` (the lifecycle rules, the
   allowed statuses, and the "when an ADR is required" bar — Job 2 depends on that bar).
   Collect every ADR's status and date in one pass:
   `grep -H "^- Status:\|^- Date:\|^- Supersede" docs/adr/0*.md`. Note today's date for the
   report filename. Skim `docs/CHANGELOG.md`'s most recent two releases and
   `gh issue list --state open` — the direction context each subagent needs.

2. **Build the direction brief.** Before fanning out, write 8–12 bullets of _what has
   actually changed lately_ — shipped epics, open bugs that contradict a decision,
   in-flight migrations, anything contested. **The audit is only as good as this brief**;
   subagents cannot infer direction from code alone. Tell them to verify anything they rely
   on rather than trusting the brief.

3. **Fan out one subagent per cluster, in parallel** (single message, multiple Agent calls).
   `model: sonnet`. Cluster by _subject matter_, not number, so each agent can hold one
   mental model. Reconcile these against the current `docs/adr/` listing:

   - **Gameplay / scoring / fairness** — grading presets, scoring rules, reveal timing,
     catch-up, badges, rating, participation boundary
   - **Data / infra / performance** — tenancy, RLS/grants, migrations, matviews, caching,
     auth hot path, data-loading patterns
   - **Platform / process / external / brand** — delivery process, release gating,
     versioning, schedule/score sourcing, OAuth, AI, demo, feedback, brand
   - **Design + gap hunt** — the design/product governing ADRs, **plus Job 2 below**

4. **Give every subagent the same verdict vocabulary** and require exactly one per ADR:

   | Verdict       | Means                                                                        |
   | ------------- | ---------------------------------------------------------------------------- |
   | **KEEP**      | Accurate and load-bearing. No action.                                        |
   | **AMEND**     | Decision still right; the record is stale or silent about a known exception. |
   | **SUPERSEDE** | Reality moved. Needs a new ADR with `Supersedes: ADR-NNNN`.                  |
   | **RATIFY**    | Status is `Proposed` but it is already being treated as law.                 |
   | **RETIRE**    | Obsolete or moot — including "Proposed, never built, withdraw it".           |

5. **Job 2 — hunt the gaps (the more valuable half).** One subagent hunts decisions the app
   has **already made** that clear `docs/adr/README.md`'s bar but have no ADR: trust
   boundaries, new persistent data models or external services, cross-cutting patterns,
   fairness/scoring semantics, constraints affecting many future features, hard-to-reverse
   infrastructure. Require it to **list the leads it checked and rejected**, with reasons —
   that list is real output, and it stops the next run re-litigating the same candidates.

6. **Verify before you report.** Subagent evidence goes stale too. Spot-check every
   non-KEEP finding's _load-bearing_ citation yourself before it reaches the report — in the
   2026-07 run, one agent cited a duplicate RLS file that had already been reduced to an
   empty placeholder, and one flagged an ADR as stale where the deeper read cleared it. A
   finding you could not re-verify does not go in the report.

7. **Synthesize (orchestrator).** Assemble:
   - A **verdict tally** (`N KEEP · N AMEND · …`) and a table of every non-KEEP ADR.
   - **Act now** — cheap doc-only corrections, ranked. These are usually one PR.
   - **Amend when related work lands** — with the triggering issue/PR named.
   - **Missing ADRs** from Job 2, each with the specific decision that would be recorded.
   - Any **corrections** you made to subagent findings, stated plainly.

8. **Write** the report to `docs/audits/YYYY-MM-DD-adr-audit.md`. **Do not commit, push, or
   file issues.** Lead with the tally and the top 3, and offer `new-adr` for the gaps and a
   single corrections PR for the "act now" set.

## Discipline

- **Age is not a finding.** A 2026-06 ADR that still describes what the code does is a
  _success_. Only drift between record and reality counts.
- **Separate "wrong" from "not yet built".** An accepted ADR whose implementation issues are
  still open is a **delivery gap**, not an ADR defect — the record is doing its job. Say so
  explicitly and move on; do not pad the report with these.
- **Most ADRs should come back KEEP.** A run that flags half the corpus has lowered its bar,
  not found more drift.
- **Amend, don't rewrite.** Accepted ADRs are superseded or amended, never silently edited
  (`docs/adr/README.md` lifecycle). ADR-0010 and ADR-0026 carry the house amendment-section
  pattern — follow their shape.
- **Watch for the `Issue: None` blind spot.** `scripts/check-governance-freshness.ts` only
  inspects ADRs that are `Proposed` **and** carry a linked issue number, so an
  `Issue: None — approved plan` ADR can sit `Proposed` forever unseen. Check those by hand
  every run.
- **Read-only except the report.** Whether to commit it is Doug's call.

## When to run it

Not on `cut-release` — that is a write hot path ending in a prod deploy, and releases here
are roughly weekly; a fan-out audit there would stall shipping. The layering is:

| Layer       | Where                                                                                                         | Cadence                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Prevent** | `finish-pr` — if the PR closes an issue named in a linked ADR's Follow-up, update that section in the same PR | every PR                                             |
| **Detect**  | `check-governance-freshness.ts` — aging `Proposed` ADRs, including `Issue: None` ones                         | every PR (CI)                                        |
| **Audit**   | **this skill**                                                                                                | pre-season, each offseason, or ~every 10 feature PRs |

Most drift should be caught by the first two. If a run of this skill finds a lot, that is a
signal the cheap layers are not doing their job — say so in the report.

## See also

- `docs/adr/README.md` — lifecycle, allowed statuses, and the "when an ADR is required" bar
- Sibling audits: `pattern-audit` (code vs documented standards), `product-audit` (shipped
  features vs `PRODUCT.md`), `db-deep-scan` (grading correctness + RLS)
- `new-adr` (scaffold a record for a Job 2 gap) · `issue-author` (turn a finding into work)
