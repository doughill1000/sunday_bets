---
name: start-issue
description: Start work on a Ready GitHub issue end-to-end — read the issue and its ADRs, load the matching context packs, create an isolated worktree with new-worktree.ps1, implement the change, then hand off to finish-pr to test and open the PR. Use when beginning implementation of an assigned issue.
---

# Start work on an issue

One issue → one branch → one worktree → one PR. Canonical: `docs/WORKFLOW.md`
§"Claim and isolate work" and `AGENTS.md` §"Delivery workflow".

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
   link or a credible reason none is needed).
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

- To check whether related work has **already shipped**, read `docs/CHANGELOG.md`
  first (terse, newest-first, in-context), then `gh` for anything newer — don't
  reverse-engineer completion from source.
- Branch from a **freshly fetched `origin/master`** — the local clone can be months
  stale (Doug works across machines).
- **Serialize** work touching the migration ledger, generated types, or shared
  auth/RLS unless an explicit integration order exists.
- Never run two agents in the same worktree; never clean another agent's worktree.
- **Confirm before any GitHub write.**

## See also

- `docs/WORKFLOW.md` §"Claim and isolate work"
- Sibling skills: `issue-author` (creates the issue, upstream of this one) and
  `finish-pr` (the closing bookend this skill now invokes automatically).
