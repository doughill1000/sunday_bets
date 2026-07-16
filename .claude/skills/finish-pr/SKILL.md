---
name: finish-pr
description: Wrap a feature branch into a pull request — run the test gate, draft the PR with Closes #NNN, the ADR link, and the verification that actually ran, push and open the PR (pre-authorized — no confirmation), then clean up the worktree. Use when finishing an issue and opening its PR.
---

# Finish & open the PR

Closing bookend of the delivery loop. Canonical: `docs/WORKFLOW.md`
§"Pull request and merge".

## Steps

1. Ensure the `test-gate` checks have passed against the **current** branch state. If
   you already ran the gate earlier in this session and nothing has changed since (no new
   commits or edits), **reuse those results — do not re-run it** (re-running a green gate
   on an unchanged tree wastes minutes, especially integration/e2e). Otherwise run the
   `test-gate` skill now. Either way, **record exactly which layers ran** and why any were
   skipped — this goes in the PR body verbatim.
2. If the branch is based on older trunk, refresh from `origin/master`, reverify, and
   regenerate any artifacts (types, migration ledger) from the **combined** state —
   never resolve a ledger conflict by taking one side wholesale.
3. **Add the shipped-history entry as a fragment** (required — do not open the PR
   without it). Create `docs/changelog.d/<branch-slug>.md` (the branch name with `/` →
   `-`, e.g. `chore/foo` → `chore-foo.md`) and commit it on the branch so it travels
   inside this PR (it lands in `master` exactly when the code does — no separate write,
   no drift). A uniquely-named fragment per PR is why concurrent same-day PRs no longer
   collide on the shared `docs/CHANGELOG.md`; `cut-release` assembles the fragments into
   the release block. The fragment holds the bullet only (no `## <date>` heading): `-
**#NNN** <short title> — <what changed and why it matters>` plus notable
   tables/views/routes/files (as bare pointers) and the governing ADR when useful.
   **Keep it a pointer, not a spec:** one or two sentences — no function/variable names,
   config values (TTLs, thresholds), enumerated test files, error codes, or step-by-step
   prod recaps; the PR, the code, and the ADR hold that detail (a changelog that names a
   TTL or an internal symbol lies the moment either changes). If the PR closes no issue
   (chore/skill/CI/infra/docs), still add a fragment, keyed by PR number as `- **PR
#NNN** …`. See `docs/changelog.d/README.md` for the convention.
4. **Carry version intent (ADR-0015).** Confirm the closed issue has a `semver:` label
   and a target milestone (set by `issue-author`); inherit both onto the PR. For an
   issue-less PR (chore/skill/CI/infra/docs), apply `semver:patch` and attach the active
   milestone. **Do not bump `package.json`** — the version is computed and bumped only by
   `cut-release` at release time, not in feature PRs.
5. **For PRs that change user-facing UI**, fill in the PR template's **Design
   checklist** honestly — never delete the section just because the change is small.
   It is a pass/fail merge gate per `docs/DESIGN.md` (ADR-0030), including AA contrast
   in **both** themes (dark and Parchment light). If the PR changes a screen
   `docs/DESIGN.md` names as canonical, update the guide's references in the same PR
   (per `CLAUDE.md`).
6. Draft the PR body:
   - `Closes #NNN`
   - link the governing or proposed ADR; explain any deviation from it
   - list the verification that **actually ran** (from step 1)
7. Push the branch and open the PR with `gh pr create` — both are **pre-authorized**
   (see user `CLAUDE.md` §"GitHub Access"), so do not stop to confirm. Report the PR
   URL afterward.
8. Move the GitHub Project item to **Review**.
9. After the branch merges and is no longer needed, clean up:
   ```powershell
   git worktree remove ..\sunday_bets-claude-NNN
   git worktree prune
   ```

## See also

- `docs/WORKFLOW.md` §"Pull request and merge" and §"Versioning"
- `docs/adr/0015-versioning-and-release-policy.md` (why no `package.json` bump here)
- Sibling skills: `test-gate` (the checks), `db-pr-review` (DB-diff review),
  `cut-release` (bumps the version + cuts the release).
