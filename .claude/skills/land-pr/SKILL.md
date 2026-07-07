---
name: land-pr
description: Land a PR that's already open — poll its CI checks, hand off a red one to ci-triage, confirm before merging, then move the closed issue's Project item to Done and clean up its worktree. Use when Doug says "land PR #NNN", "merge it", "is it ready to merge", or after finish-pr has opened a PR and checks are running. Bookends finish-pr (opens the PR); handles ONE specific PR through to merge, unlike cleanup-worktrees' batch sweep.
---

# Land the PR

Closing half of the delivery loop that `finish-pr` opens. Canonical:
`docs/WORKFLOW.md` §"Pull request and merge".

## Steps

1. **Poll checks.**

   ```powershell
   gh pr checks <NNN> --repo doughill1000/sunday_bets
   ```

   If checks are still running, say so and wait rather than merging into an unknown
   state — don't busy-poll in a tight loop.

2. **Triage any red check.** Hand off to the `ci-triage` skill rather than re-deriving
   log-fetching logic here. Not every red check is a hard blocker — see its "Remember"
   section for which checks the merge ruleset actually requires. Once it reports
   "fixed and pushed" or "safe to proceed," return to step 1 for a fixed check, or
   continue for one that was never required.

3. **Confirm before merging.** Merging is a GitHub write requiring Doug's go-ahead —
   this is _not_ covered by the push/PR-create pre-authorization in `CLAUDE.md`. Show
   the PR number, title, and final check summary, then wait for explicit approval.

4. **Merge.** This repo merges with merge commits, not squash/rebase —
   `cleanup-worktrees` relies on the merged branch tip being an ancestor of
   `origin/master`:

   ```powershell
   gh pr merge <NNN> --repo doughill1000/sunday_bets --merge
   ```

5. **Move the Project item to Done.** The Project tracks the **issue**, not the PR.
   Resolve the closing issue, find its item, flip Status:

   ```powershell
   $issueNum = (gh pr view <NNN> --repo doughill1000/sunday_bets --json closingIssuesReferences |
     ConvertFrom-Json).closingIssuesReferences[0].number
   $itemId = ((gh project item-list 1 --owner doughill1000 --format json --limit 500 |
     ConvertFrom-Json).items | Where-Object { $_.content.number -eq $issueNum }).id
   gh project item-edit --id $itemId --project-id PVT_kwHOAGAfqM4BbXA1 `
     --field-id PVTSSF_lAHOAGAfqM4BbXA1zhWIDLs --single-select-option-id 561ff97d
   ```

   An issue-less PR (chore/skill/CI/infra/docs) closes no issue and has no Project
   item — skip this step for those.

6. **Clean up the worktree**, if this PR had one:
   ```powershell
   git worktree remove ..\sunday_bets-claude-NNN
   git worktree prune
   ```
   If several worktrees have piled up, run `cleanup-worktrees` instead of doing this
   one at a time.

## Remember

- Steps 4–6 all follow from the **one** confirmation in step 3 — don't re-confirm
  each sub-step; that's friction neither `CLAUDE.md` nor `docs/WORKFLOW.md` asks for.
- If the branch is based on stale trunk, refresh from `origin/master` and reverify
  (`finish-pr` step 2) before merging — don't merge a branch that hasn't seen recent
  `master`, especially one touching the migration ledger or generated types.
- Merge dependencies first when landing more than one PR — `docs/WORKFLOW.md`
  §"Pull request and merge" step 5.
- The Project's field/option ids (`PVT_kwHOAGAfqM4BbXA1` / Status field
  `PVTSSF_lAHOAGAfqM4BbXA1zhWIDLs`; Review=`59ad87af`, Done=`561ff97d`) are this
  repo's Project #1 — re-derive with `gh project field-list 1 --owner doughill1000`
  if the Project is ever recreated.

## See also

- `docs/WORKFLOW.md` §"Pull request and merge"
- Sibling skills: `finish-pr` (opens the PR this lands), `ci-triage` (diagnoses a red
  check), `cleanup-worktrees` (batch sweep instead of one worktree at a time)
