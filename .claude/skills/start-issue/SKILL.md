---
name: start-issue
description: Start work on a Ready GitHub issue end-to-end — read the issue and its ADRs, load the matching context packs, create an isolated worktree with new-worktree.ps1, implement the change, then hand off to finish-pr to test and open the PR. Use when beginning implementation of an assigned issue.
---

# Start work on an issue

One issue → one branch → one worktree → one PR. Canonical: `docs/WORKFLOW.md`
§"Claim and isolate work" and `AGENTS.md` §"Delivery workflow".

> **Model & effort.** Implementation quality tracks the model. Check the issue body for
> an **Execution (model / effort)** section first — `issue-author` sets one on every
> issue it creates, and `scope-issue` updates it if the interview changed the picture —
> and use that recommendation. If the issue predates that convention and carries none,
> fall back to the same bar: run **non-trivial work — real business logic, DB/migration,
> or a new/reworked UI surface — on the heaviest available model (Opus-class or
> above — e.g. Fable)**; small or mechanical changes (copy, single-property style, a
> contained one-file edit) are fine on Sonnet. A skill can't switch the session's model,
> so this is advisory: pick the model before invoking based on the issue's difficulty.

This skill runs the full delivery loop in one pass: setup (below), then
implementation, then the `finish-pr` skill. Don't stop after setup to wait for a
separate invocation — continue straight into implementing the issue once the
worktree is ready, and continue straight into `finish-pr` once implementation is
locally verified. Still honor every confirmation gate along the way (GitHub writes
per `CLAUDE.md` §"GitHub Access" — note `git push` and `gh pr create` are
pre-authorized per that section and per `finish-pr` step 6).

## Steps

1. Read the full issue and any linked ADRs: `gh issue view NNN`. Confirm it is
   **Ready** (one mergeable outcome, observable acceptance criteria, a governing ADR
   link or a credible reason none is needed). If the issue links a **design study**, treat
   its before/after mockups as the visual target for the UI you build.
2. Infer the areas the issue touches and read the matching context packs
   (auth / database / ui / testing) per `docs/agent-context/README.md` — they hold the
   rules most often gotten wrong.
3. Create the isolated worktree from freshly-fetched trunk (branch name
   `claude/NNN-short-slug`):
   ```powershell
   & scripts/new-worktree.ps1 -Branch claude/NNN-short-slug
   ```
   (Invoke with the call operator `&` — the agent's PowerShell tool is already a
   PowerShell session, so a nested `powershell -File …` fails to resolve `powershell`
   when the tool's PATH is stripped.) The script fetches `origin`, adds the worktree off
   `origin/master`, copies every
   gitignored `.env*` (a fresh worktree has none and can't reach Supabase/Odds API),
   and installs deps. Add `-Port 5174 -Dev` to also launch dev.
4. Run that worktree's dev server without leaving the current repo (non-5173 port so
   it coexists with the main checkout):
   ```powershell
   pnpm -C ..\sunday_bets-claude-NNN run dev --port 5174
   ```
5. Implement the issue's acceptance criteria in the worktree, guided by the context
   packs and ADR(s) from step 2. This is ordinary code work, not a scripted recipe —
   use judgment on scope and approach, and stay inside the issue's stated acceptance
   criteria (surface scope questions to Doug rather than expanding silently).
6. Once implemented and locally verified, invoke the `finish-pr` skill to run the
   test gate, add the changelog entry, and open the PR. Do not wait to be asked.

## Remember

- To check whether related work has **already shipped**, read both
  `docs/CHANGELOG.md` and the unreleased `docs/changelog.d/` fragments — merged-but-
  unreleased work lives only in fragments until `cut-release` assembles them — and
  read both from **`origin/master`**, never the checked-out branch (the local
  checkout can be stale or mid-feature): `git show origin/master:docs/CHANGELOG.md`
  and `git ls-tree origin/master docs/changelog.d/`. Then `gh` for anything newer —
  don't reverse-engineer completion from source.
- Branch from a **freshly fetched `origin/master`** — the local clone can be months
  stale (Doug works across machines).
- **Serialize** work touching the migration ledger, generated types, or shared
  auth/RLS unless an explicit integration order exists.
- Never run two agents in the same worktree; never clean another agent's worktree.
- **Push and open PRs without asking (pre-authorized); never merge — landing code is
  Doug's call.**

## See also

- `docs/WORKFLOW.md` §"Claim and isolate work"
- Sibling skills: `issue-author` (creates the issue, upstream of this one),
  `design-study` (the visual spec, if the issue links one), and `finish-pr` (the
  closing bookend this skill now invokes automatically).
