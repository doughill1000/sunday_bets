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

**Every GitHub/deploy write in this skill is confirmed with Doug first** (per the
user-level "confirm before any GitHub write" rule). `gh` is not on the Git Bash PATH —
run it from PowerShell with the standard PATH refresh.

## Steps

1. **Confirm the milestone is done.** Run the `release-status` skill for the target
   version. Proceed only if its milestone is `open=0` and there is no release-relevant PR
   still open on the current branch.
2. **Compute the version (ADR-0015).** The base is the last shipped version; the level is
   the highest `semver:` label across the work in this release:
   ```powershell
   $env:PATH = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
   git tag --sort=-v:refname | Select-Object -First 1          # base, e.g. v2.3.0
   gh issue list --repo doughill1000/sunday_bets --milestone "vX" --state all `
     --json number,labels | ConvertFrom-Json                   # read each issue's semver: label
   ```
   `new = bump(base, level)` with major > minor > patch (default **patch** if no label).
   Major bumps `X.0.0`, minor bumps `x.Y.0`, patch bumps `x.y.Z`. Include any issue-less
   PRs merged since `base` (they carry `semver:` labels from `finish-pr`).
3. **Open the release PR.** On a fresh branch off `origin/master`, set `package.json`
   `"version"` to `<new>` (this is the **only** place the version is bumped — `finish-pr`
   never bumps it). Title `chore(release): v<new>`. Do **not** restructure
   `docs/CHANGELOG.md` (it stays date-grouped; the per-version notes come from the GitHub
   Release). Add a CHANGELOG entry for the bump itself, keyed `**PR #NNN**`. Confirm, then
   `gh pr create`; merge after checks.
4. **Deploy.** After the release PR merges, trigger the production release — a single
   manual dispatch (ADR-0010): **Actions → Deploy Production → Run workflow**, or
   ```powershell
   gh workflow run deploy-prod.yml --repo doughill1000/sunday_bets --ref master
   ```
   It runs migration-ledger check → prod DB backup → `supabase db push` → `vercel build/
deploy --prod` → tag `v<new>` + create the GitHub Release (auto-notes; refine them).
5. **Close out.** Close the shipped milestone; open the next milestone if absent; update
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

## See also

- `docs/WORKFLOW.md` §"Cutting a release" and §"Versioning"
- `docs/adr/0015-versioning-and-release-policy.md` (label-driven SemVer),
  `docs/adr/0010-production-release-gating.md` (manual-dispatch deploy)
- Sibling skills: `release-status` (the read-only "is it done?" check),
  `reconcile-blocked` (unblock what this release satisfied).
