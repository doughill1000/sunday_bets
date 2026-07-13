# Changelog fragments (unreleased entries)

Each merged PR drops **one uniquely-named file** in this directory instead of editing
the top of [`docs/CHANGELOG.md`](../CHANGELOG.md). The fragments accumulate here as the
**unreleased window**; `cut-release` assembles them into the release's
`## v<version>` block in `CHANGELOG.md` and deletes them.

## Why fragments instead of editing `CHANGELOG.md` directly

Every PR used to append its entry to the same region — the top of `CHANGELOG.md`, under
the current `## <date>` heading. Two PRs landing the same day (routine) collide there.
`.gitattributes` has `docs/CHANGELOG.md merge=union`, which resolves that cleanly for
**local** merges, but GitHub's mergeability check and merge button run a plain 3-way
merge that ignores `.gitattributes` merge drivers — so GitHub still flags the PR
`CONFLICTING` and a human has to merge `origin/master` locally and push just to clear it.

A fragment has a **unique filename**, so two PRs never touch the same path and GitHub
never reports a changelog conflict. The entry still rides _inside_ its PR, so it lands
in `master` exactly when the code does — no drift.

## How to add one (the `finish-pr` step)

Create `docs/changelog.d/<branch-slug>.md` — the branch name with `/` → `-`
(e.g. branch `chore/changelog-fragments` → `chore-changelog-fragments.md`). The branch is
one-per-issue, so the name is unique, and it's known before the PR number exists.

The file holds the **same terse bullet** you would have put at the top of `CHANGELOG.md` —
no `## <date>` heading (the date is captured at release-assembly time):

```md
- **#586** Adopt per-PR changelog fragments — every PR drops a file here instead of
  editing the top of `CHANGELOG.md`, so concurrent same-day PRs never collide. files:
  `scripts/check-governance-freshness.ts` · `docs/changelog.d/` · finish-pr / cut-release
```

Rules (unchanged from `CHANGELOG.md`'s own policy):

- **Key it** by closed-issue number (`- **#NNN** …`) or, for an issue-less PR
  (chore/skill/CI/infra/docs), by PR number (`- **PR #NNN** …`). The governance-freshness
  gate greps for that reference, so it must be present.
- **Pointer, not spec** — one or two sentences on _what_ changed and _why it matters_,
  plus notable tables/views/routes/files as bare pointers and the governing ADR. No
  function/variable names, config values (TTLs, thresholds), enumerated test files, or
  step-by-step prod recaps.

## Finding out whether something shipped

`CHANGELOG.md` holds everything from the last release backward; **unreleased** entries
live here until the next release cut. So "is X done?" reads both this directory and
`CHANGELOG.md`. The governance-freshness gate and the `release-status` / `reconcile-blocked`
skills already do.

Only `README.md` in this directory is not a fragment — the assembler and the governance
gate ignore it.
