---
name: start-issue
description: Start work on a Ready GitHub issue — read the issue and its ADRs, load the matching context packs, create an isolated worktree with new-worktree.ps1, and print the dev command. Use when beginning implementation of an assigned issue.
---

# Start work on an issue

One issue → one branch → one worktree → one PR. Canonical: `docs/WORKFLOW.md`
§"Claim and isolate work" and `AGENTS.md` §"Delivery workflow".

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
   powershell -File scripts/new-worktree.ps1 -Branch claude/NNN-short-slug
   ```
   The script fetches `origin`, adds the worktree off `origin/master`, copies every
   gitignored `.env*` (a fresh worktree has none and can't reach Supabase/Odds API),
   and installs deps. Add `-Port 5174 -Dev` to also launch dev.
4. Run that worktree's dev server without leaving the current repo (non-5173 port so
   it coexists with the main checkout):
   ```powershell
   pnpm -C ..\sunday_bets-claude-NNN run dev -- --port 5174
   ```

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
- Sibling skills: `issue-author` (creates the issue) and `finish-pr` (closes it out).
