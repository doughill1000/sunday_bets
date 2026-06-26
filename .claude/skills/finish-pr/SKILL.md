---
name: finish-pr
description: Wrap a feature branch into a pull request — run the test gate, draft the PR with Closes #NNN, the ADR link, and the verification that actually ran, confirm before the GitHub write, then clean up the worktree. Use when finishing an issue and opening its PR.
---

# Finish & open the PR

Closing bookend of the delivery loop. Canonical: `docs/WORKFLOW.md`
§"Pull request and merge".

## Steps

1. Run the `test-gate` skill first. **Record exactly which layers ran** and why any
   were skipped — this goes in the PR body verbatim.
2. If the branch is based on older trunk, refresh from `origin/master`, reverify, and
   regenerate any artifacts (types, migration ledger) from the **combined** state —
   never resolve a ledger conflict by taking one side wholesale.
3. **Add the shipped-history entry to `docs/CHANGELOG.md`** (required — do not open the
   PR without it) and commit it on the branch so it travels inside this PR (it then
   lands in `master` exactly when the code does — no separate write, no drift).
   Newest-first, under a `## YYYY-MM-DD` heading: `- **#NNN** <short title> — <what
changed>` plus notable tables/views/routes and the governing ADR when useful. If the
   PR closes no issue (chore/skill/CI/infra/docs), still add an entry, keyed by PR
   number as `- **PR #NNN** …`. See the format note at the top of `docs/CHANGELOG.md`.
   It's a shared file: if the top conflicts with another in-flight PR, keep both
   entries.
4. Draft the PR body:
   - `Closes #NNN`
   - link the governing or proposed ADR; explain any deviation from it
   - list the verification that **actually ran** (from step 1)
5. **Confirm before the GitHub write**, then open with `gh pr create`.
6. Move the GitHub Project item to **Review**.
7. After the branch merges and is no longer needed, clean up:
   ```powershell
   git worktree remove ..\sunday_bets-claude-NNN
   git worktree prune
   ```

## See also

- `docs/WORKFLOW.md` §"Pull request and merge"
- Sibling skills: `test-gate` (the checks), `db-pr-review` (DB-diff review).
