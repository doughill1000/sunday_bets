---
name: pattern-audit
description: Audit and grade the repo's established patterns layer-by-layer — fan out a subagent per layer (UI, server, DB source, migrations, auth/RLS, workflows, tests, types/config, delivery process), grade each against the repo's own documented standards (AGENTS.md, ADRs, agent-context packs) for both conformance and forward-looking maintainability/scalability, and write a maturity-scored report to docs/audits/. Use when Doug asks to "grade the repo", "audit our patterns", or "what should we patch for maintainability/scalability". Read-only except for the report file; does not commit, push, or open issues without approval.
---

# Repository pattern audit

Doug built much of this repo pre-agent and wants to know which patterns to patch for
future maintainability and scalability. Eyeballing the whole repo at once, or grading
against generic "best practices", produces noise. The value here is **parallel per-layer
grading against the repo's _own_ documented standards** — `AGENTS.md`, the ADRs under
`docs/adr/`, and the `docs/agent-context/` packs — plus a forward-looking critique of
whether each pattern will scale. Every lane scores two axes: **conformance** (does the
code follow the documented rule?) and **pattern quality** (is the pattern itself worth
keeping?). The output is one maturity-scored report file — **read-only otherwise**.

This grades against what the repo says about itself. Do not invent rules. If a lane has no
governing doc, say so and grade on general maintainability — but flag the missing standard
as its own finding (that gap is often the real thing to patch).

## Steps

1. **Preflight (orchestrator).** Read the governance index so the rubric reflects current
   reality, not memory: `AGENTS.md`, `docs/adr/README.md` (ADR index + each Status), and
   `docs/agent-context/README.md`. Note today's date for the report filename. If the
   working tree is dirty with unrelated changes, mention it — the audit reads HEAD as-is.

2. **Fan out one subagent per layer, in parallel** (single message, multiple Agent calls).
   Use `subagent_type: Explore`, `model: sonnet` for read-only grading; escalate a lane to
   `model: opus` only for the cross-cutting **Auth / RLS / grants** or **Delivery / process
   governance** lanes when the nuance warrants it. Give each subagent exactly: its scope
   paths, the canonical rubric docs to grade against (from the table below), the maturity
   scale, and the grade-block schema. Tell each one to read the rubric docs **first**, then
   the code, and to cite `path:line` evidence for every finding.

   The nine lanes are in **Layers and rubric sources** below. Nine parallel subagents is
   fine; if that is too many at once, run them in two batches but keep lanes independent.

3. **Collect** each subagent's grade block **verbatim** — do not re-grade or soften their
   scores. If a block is malformed or missing evidence, send the subagent back for a fix
   rather than papering over it.

4. **Synthesize (orchestrator).** Assemble the report:
   - A **scorecard table** (lane → maturity 1–5 → one-line justification).
   - An **executive summary**: 3–5 cross-cutting themes that span lanes (e.g. "RLS is
     enforced but grants drift", "test coverage is deep on DB, thin on UI"). This is where
     the "what to patch" answer lives.
   - A **single prioritized recommendation list** (P0→P3) merged across all lanes, each
     item naming the lane and the `path:line` evidence.
   - The full per-lane grade blocks, in lane order, underneath.

5. **Write** the report to `docs/audits/YYYY-MM-DD-pattern-audit.md` (create `docs/audits/`
   if absent). **Do not commit, push, or open issues.** Tell Doug the path, lead with the
   scorecard and the top 3 recommendations, and offer follow-ups — e.g. `issue-author` to
   file the P0/P1 findings (which runs its own draft-before-write approval gate).

## Layers and rubric sources

Grade each lane against the linked docs — link, don't restate. (`§` = read the named
section.)

| Lane                                     | Scope paths                                                                                                                                            | Grade against                                                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI / frontend**                        | `src/routes/**/*.svelte`, `src/lib/components/**` (exclude vendored `src/lib/components/ui/`), `src/lib/stores/**`                                     | `docs/agent-context/ui.md` (Svelte 5 runes, Tailwind 4 `@theme`, vendored-shadcn rule), `AGENTS.md` §"Repo map"                                                                                                                      |
| **Server / backend**                     | `src/lib/server/**` (note the `db/queries` reads vs `db/commands` writes split), `src/routes/(app)/api/**`, `src/lib/domain/**`, `src/hooks.server.ts` | `AGENTS.md` §"Repo map" (queries/commands split, `domain/rules.ts` mirrored in TS + SQL), `docs/agent-context/auth.md`                                                                                                               |
| **DB SQL source**                        | `supabase/src/**` (schemas, functions, views, indexes, policies, grants)                                                                               | `docs/agent-context/database.md` (edit-src-only, one-primary-object-per-file), ADR-0002 (tenancy + `group_id`-led index), `README.md` ledger walkthrough                                                                             |
| **Migrations & ledger**                  | `supabase/migrations/**`, `supabase/.migration-hash.json`, `supabase/scripts/generate-migration.ts`                                                    | `README.md` hash-ledger walkthrough, ADR-0012 (rebaseline), `docs/agent-context/database.md` (generated, never hand-edited)                                                                                                          |
| **Auth / RLS / grants** (cross-cutting)  | `is_admin()` + policies in `supabase/src`, `supabase/src/grants/**`, `src/hooks.server.ts`, service-role client usage                                  | ADR-0004, ADR-0006, ADR-0011 (closed-by-default baseline), `docs/agent-context/auth.md`. Focus on boundary **consistency** (`is_admin()` ↔ `hooks.server.ts`, grant ↔ RLS ↔ pgTAP); don't re-grade every query the other lanes cover |
| **Workflows / CI / deploy**              | `.github/workflows/**` (CI gates, the `_cron-call.yml` thin callers, `deploy-*`, `migrate-*`)                                                          | ADR-0010 (version-gated deploys, `$env/dynamic/private`), `docs/WORKFLOW.md`, CI rules in `docs/agent-context/testing.md`                                                                                                            |
| **Tests (4 tiers)**                      | `src/**/__tests__/**` (unit), `tests/integration/**`, `supabase/tests/**` (pgTAP), `tests/e2e/**`                                                      | `docs/agent-context/testing.md` (when-to-run-which-layer matrix, E2E 5 pillars), coverage thresholds in `vitest.config.ts` / `vitest.integration.config.ts`                                                                          |
| **Types & config / tooling**             | `src/lib/types/**`, `package.json` scripts, `eslint.config.js`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`                                  | `AGENTS.md` §"Formatting" + generated-types rule + `@typescript-eslint/no-explicit-any` policy, `docs/agent-context/database.md` (generated `supabase.ts`)                                                                           |
| **Delivery / process governance** (meta) | `AGENTS.md`, `docs/WORKFLOW.md`, `docs/adr/**`, `docs/CHANGELOG.md`, recent `git log`                                                                  | Internal consistency: are the docs current, ADR Statuses accurate, CHANGELOG kept, the process self-consistent and actually followed? This lane directly serves "patch some processes"                                               |

## Grade block schema

Each subagent returns exactly this, and nothing else:

```
### <Lane name> — Maturity: <1–5>
**Justification:** <one line tying the score to the rubric>
**Conformance findings** (drift from documented standards):
- [P0|P1|P2|P3] <finding> — `path:line` — <recommended fix>
**Pattern-quality findings** (maintainability / scalability of the pattern itself):
- [P0|P1|P2|P3] <finding> — `path:line` — <recommended change>
**Strengths:** <1–3 patterns worth keeping or propagating to other layers>
```

**Maturity scale** — 5 exemplary (clear, consistent, documented, scales) · 4 strong (minor
drift or small scalability caveats) · 3 adequate (works today, notable friction at scale) ·
2 at-risk (inconsistent or actively drifting from docs; refactor advisable) · 1 weak (no
coherent pattern, or violates a stated standard; remediate).

**Priority** — P0 correctness/security/data-integrity risk or hard scaling blocker · P1
significant maintainability problem, fix soon · P2 worthwhile, schedule it · P3 minor/polish.

## Remember

- **Read-only except the report.** Never commit, push, or open issues. Writing the report
  file to `docs/audits/` is the only mutation; whether to commit it is Doug's call.
- **Grade against the repo's docs, not generic advice.** A finding without a rubric anchor
  (a doc rule, an ADR, or a concrete maintainability/scalability cost) is an opinion — drop
  it or reframe it as a "missing standard" finding.
- **Don't soften subagent scores.** Carry grade blocks verbatim; the synthesis adds the
  cross-cutting view, it doesn't overrule the lanes.
- **Sonnet per lane**; escalate to Opus only for the Auth/RLS and Delivery-governance lanes.
- **Approval gate.** If the report motivates filing issues, stop and hand off to
  `issue-author` (draft-before-write) — do not write to GitHub from this skill.
- **`gh` must run via PowerShell** (see `AGENTS.md`), not Bash, if a lane shells out —
  most lanes are pure file reads and won't need it.

## See also

- `AGENTS.md` (conventions index), `docs/WORKFLOW.md` (delivery process)
- `docs/adr/` (durable decisions — the authoritative patterns), `docs/adr/README.md` (index)
- `docs/agent-context/{ui,auth,database,testing}.md` (per-topic depth) and `README.md`
  (hash-ledger walkthrough)
- Sibling skills: `db-pr-review` (scope a DB diff), `release-status` (read-only status
  reconciliation, same no-write discipline), `reconcile-blocked` (read-then-confirm gate),
  `issue-author` (turn a finding into an approved issue)
