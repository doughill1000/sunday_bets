---
name: dependabot-sweep
description: Sweep the (small, pre-grouped) set of open dependabot PRs — check each one's CI status and flag any major-version bump for a closer look, then confirm and merge each individually. Use when Doug asks to "clear the dependabot PRs", "merge the dependency updates", or when several dependabot PRs have accumulated. Does not combine PRs onto one branch — dependabot.yml already groups updates, and merging each individually keeps bisection clean.
---

# Sweep open dependabot PRs

`.github/dependabot.yml` already groups weekly updates into three buckets
(`production-dependencies`, `dev-dependencies` npm groups; `actions` for
github-actions), each capped at `open-pull-requests-limit: 5` — so this is normally a
sweep through **at most a handful** of PRs, not an unbounded backlog. Each dependabot
PR already triggers the full normal CI suite (`ci-tests.yml`, `ci-pgtap.yml`,
`playwright.yml` etc. all trigger on any `pull_request`), so there's no local test-gate
to run — the work here is triage and merge, not testing.

## Steps

1. **List what's open.**

   ```powershell
   gh pr list --repo doughill1000/sunday_bets --search "author:app/dependabot" --state open `
     --json number,title,labels,createdAt
   ```

2. **For each PR, check CI and read for a major bump.**

   ```powershell
   gh pr checks <NNN> --repo doughill1000/sunday_bets
   gh pr view <NNN> --repo doughill1000/sunday_bets --json body --jq .body
   ```

   Red checks → hand off to `ci-triage` rather than re-diagnosing here. A grouped PR's
   body lists each dependency's old→new version — flag any where the **major** version
   changed (e.g. `5.x → 6.x`); that's a real behavior-change risk dependabot doesn't
   distinguish from a safe patch bump, and deserves a look at the changelog before
   merging, not an automatic fast-track.

3. **Present the batch and confirm.** List each PR (number, group, CI status, any
   major-bump flag) and get Doug's go-ahead before merging — this is the same
   "confirm before any GitHub write" gate as everywhere else, just batched across
   several PRs instead of one.

4. **Merge each individually** — do not combine them onto one branch. Grouping already
   controls PR volume; combining would trade away per-bump bisectability (if one
   update breaks something weeks later, `git bisect` wants one commit per change) for a
   marginal CI-run saving that grouping already captured. Same merge strategy as
   `land-pr` (this repo merges with merge commits):
   ```powershell
   gh pr merge <NNN> --repo doughill1000/sunday_bets --merge
   ```
   No Project-item move and no worktree cleanup — dependabot PRs close no issue and
   aren't developed in an agent worktree.

## Remember

- **Don't invent a combine-and-retest step.** It sounds efficient but actually loses
  information (which specific bump broke something) for a savings that grouping
  already provides — resist "optimizing" this into one mega-merge.
- A **major**-version bump is the one case worth slowing down for — read its changelog
  for breaking changes before merging, don't just trust green CI (CI only proves the
  repo's own tests still pass, not that every code path exercising the bumped package
  is covered).
- Dependabot PRs carry no `semver:` label and attach no milestone — that's fine as-is;
  `cut-release`'s version computation defaults unlabeled PRs to `patch` (ADR-0015),
  which is correct for the overwhelming majority of dependency bumps.

## See also

- `.github/dependabot.yml` (the grouping config)
- Sibling skills: `ci-triage` (diagnose a red check here), `land-pr` (same merge
  mechanics for a human-authored PR)
