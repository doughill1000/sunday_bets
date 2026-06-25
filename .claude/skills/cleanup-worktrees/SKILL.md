---
name: cleanup-worktrees
description: Remove sibling git worktrees whose branch has already merged into origin/master, after confirming each is clean (no uncommitted or unpushed work). Use when worktrees pile up after PRs merge and you want to reclaim them safely.
---

# Clean up merged worktrees

One issue → one branch → one worktree → one PR. After the PR merges the worktree
is dead weight. This removes the merged, clean ones and leaves everything else
alone. Canonical worktree rules: `docs/WORKFLOW.md` §"Claim and isolate work".

## Steps

1. Dry run first — list which worktrees would be removed without touching
   anything:

   ```powershell
   powershell -File scripts/cleanup-worktrees.ps1
   ```

   It fetches `origin --prune`, then for each sibling worktree classifies it as:
   - **removal candidate** — branch merged into `origin/master`, clean tree, no
     commits missing from trunk
   - **KEEP** — branch not yet merged
   - **SKIP** — merged but has uncommitted changes or unpushed commits (reported,
     never auto-removed)

2. Review the candidate list. Confirm none belong to another agent's in-progress
   work.

3. Remove them:
   ```powershell
   powershell -File scripts/cleanup-worktrees.ps1 -Force
   ```
   This runs `git worktree remove` on each candidate, deletes the orphaned local
   branch (its commits are already in trunk), then `git worktree prune`.

## How "merged" is decided

This repo merges PRs with **merge commits**, so a merged branch's tip is an
ancestor of `origin/master` — the primary signal. As a fallback the script asks
GitHub whether the branch's PR is `MERGED` (via `gh`), so squash/rebase merges
are still caught.

## Remember

- **Never remove the main checkout** or another agent's worktree — the script
  skips the root automatically, but you must avoid clobbering active work.
- Anything **dirty or ahead of trunk is skipped**, not deleted — investigate
  those by hand rather than forcing removal.
- Run from the main checkout (`C:\Users\dough\code\sunday_bets`). The script
  resolves the repo root from its own location, so it works from anywhere.

## See also

- `scripts/cleanup-worktrees.ps1` — the implementation.
- Sibling skills: `start-issue` (creates the worktree), `finish-pr` (opens the PR
  and notes worktree cleanup as its final step).
