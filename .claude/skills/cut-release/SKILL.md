---
name: cut-release
description: Cut a production release once a milestone is done — the WRITE counterpart to read-only release-status. Compute the next version from the milestone's semver labels, bump package.json in a release PR, close the milestone, and trigger the manual prod deploy. Use when Doug says "cut vX", "ship the release", "release the milestone", or "bump and deploy". It does NOT report status (release-status), author issues (issue-author), or start work (start-issue).
---

# Cut a release

The write counterpart to the read-only `release-status` skill. Where `release-status`
answers "is vX done?", this skill performs the release: compute the version, bump
`package.json`, close the milestone, and trigger the manual production deploy. Canonical:
`docs/WORKFLOW.md` §"Cutting a release" and §"Versioning"; policy:
`docs/adr/0015-versioning-and-release-policy.md`; deploy gating: ADR-0010.

**Opening the release PR is pre-authorized** (like any PR). **The milestone close and
the production-deploy dispatch are confirmed with Doug first** — they sit outside the
pre-authorized push/PR/issue set (see user `CLAUDE.md` §"GitHub Access"). **Never merge
the release PR yourself — landing code is Doug's call.** Run `gh` from PowerShell, not
Bash (see `AGENTS.md`).

## Steps

1. **Confirm the milestone is done.** Run the `release-status` skill for the target
   version. Proceed only if its milestone is `open=0` and there is no release-relevant PR
   still open on the current branch.
2. **Backfill governance drift.** Run the freshness gate locally (it normally only runs
   in CI) and fix whatever it flags before computing the version, so the release ships
   on a clean governance baseline:
   ```powershell
   $env:GH_TOKEN = gh auth token
   $env:GITHUB_REPOSITORY = "doughill1000/sunday_bets"
   pnpm governance:check
   ```
   - **Changelog gaps** (a merged PR/closed issue with no entry in the changelog corpus —
     `docs/CHANGELOG.md` or a `docs/changelog.d/` fragment): add the missing entry as a
     fragment in the same terse pointer style `finish-pr` uses (`- **#NNN** ...` or
     `- **PR #NNN** ...` for issue-less PRs); step 4 assembles it into the release block.
   - **Stale ADRs** (`Status: Proposed` whose linked issue is already closed): flip the
     ADR's `Status:` line to `Accepted` (or the correct terminal status).
   - Don't guess at content you can't verify from the PR/issue itself — read it first.
3. **Compute the version (ADR-0015).** The base is the last shipped version; the level is
   the highest `semver:` label across the work in this release:
   ```powershell
   git tag --sort=-v:refname | Select-Object -First 1          # base, e.g. v2.3.0
   gh issue list --repo doughill1000/sunday_bets --milestone "vX" --state all `
     --json number,labels | ConvertFrom-Json                   # read each issue's semver: label
   ```
   `new = bump(base, level)` with major > minor > patch (default **patch** if no label).
   Major bumps `X.0.0`, minor bumps `x.Y.0`, patch bumps `x.y.Z`. Include any issue-less
   PRs merged since `base` (they carry `semver:` labels from `finish-pr`).
4. **Open the release PR.** On a fresh branch off `origin/master`, set `package.json`
   `"version"` to `<new>` (this is the **only** place the version is bumped — `finish-pr`
   never bumps it). Title `chore(release): v<new>`.
   - **Assemble this release's changelog window.** The window's entries live as
     fragments in `docs/changelog.d/` (everything merged since `base`, including whatever
     step 2 just backfilled) — plus any leftover `## YYYY-MM-DD` date headings still in
     `docs/CHANGELOG.md` from before the fragments migration. Collapse them all into one
     `## v<new> — YYYY-MM-DD` heading (today's date), directly under the "How entries are
     added" section. Condense each fragment/entry to a single line — `- **#NNN**/**PR
#NNN** short title — one clause` — dropping multi-line prose but **keeping every
     `#NNN` / `PR #NNN` reference intact**, since the governance-freshness gate greps for
     them. Then **delete the assembled fragment files** from `docs/changelog.d/` (leave
     `README.md`). Entries from earlier releases are untouched — this only assembles the
     window being cut. Add the release-bump line itself (`**PR #NNN** Release v<new>`) at
     the top.
   - Confirm the squashed result with Doug, then `gh pr create`; merge after checks.
5. **Deploy.** After the release PR merges, trigger the production release — a single
   manual dispatch (ADR-0010): **Actions → Deploy Production → Run workflow**, or
   ```powershell
   gh workflow run deploy-prod.yml --repo doughill1000/sunday_bets --ref master
   ```
   It runs migration-ledger check → prod DB backup → `supabase db push` → `vercel build/
deploy --prod` → tag `v<new>` + create the GitHub Release (auto-notes; refine them).
6. **Close out.** Close the shipped milestone; open the next milestone if absent; update
   `ROADMAP.md` only if direction/ordering changed (not to mirror issue status); then run
   `reconcile-blocked` to clear any issues gated on this release.

## Remember

- The version is **computed**, not guessed: base = latest `v*` tag, level = highest
  `semver:` label in the milestone. A missing label means `patch` — sanity-check that a
  feature-bearing release is not silently a patch.
- `package.json` holds the **last shipped** version between releases (ADR-0015). Bump it
  only here.
- Merging never ships (ADR-0010); the manual `deploy-prod` dispatch is the release moment.
  The version is read at dispatch to tag `v<version>`, skipping if the tag exists.
- Confirm before the release PR, the milestone close, and the deploy dispatch.
- The governance backfill (step 2) adds any missing entries as fragments and the
  assembly (step 4) folds them into `docs/CHANGELOG.md`, so do them in that order in one
  branch — assembling first would bury gaps the governance check hasn't found yet.
- The assembly is release-cut-only. `finish-pr` still adds one `docs/changelog.d/`
  fragment per PR as normal; only `cut-release` ever assembles a window of fragments into
  `CHANGELOG.md` and deletes them, and only the window since the previous tag.

## See also

- `docs/WORKFLOW.md` §"Cutting a release" and §"Versioning"
- `docs/adr/0015-versioning-and-release-policy.md` (label-driven SemVer),
  `docs/adr/0010-production-release-gating.md` (manual-dispatch deploy)
- Sibling skills: `release-status` (the read-only "is it done?" check),
  `reconcile-blocked` (unblock what this release satisfied).
