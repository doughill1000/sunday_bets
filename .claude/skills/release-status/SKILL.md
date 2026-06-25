---
name: release-status
description: Report whether a version/milestone is actually done before moving to the next one — reconcile the authoritative roadmap against GitHub milestones, releases, tags, package.json, and the changelog, then surface what shipped, what was deferred to the next version, and what is blocked. Use when Doug asks "is vX done?", "anything left for vX?", "what shipped in milestone Y?", or "release readiness" — read-only; it does not author issues (issue-author), start work (start-issue), or cut the release.
---

# Release / milestone status check

Triggered when Doug is about to move between versions and asks what is left: "is v2.0
done?", "anything I'm missing before I start v2.1?", "what shipped in vX?". The output
is a reconciled status report — **read-only, no state changes**. Canonical product
direction: `ROADMAP.md`; shipped history: `docs/CHANGELOG.md`.

A clean milestone count alone is a trap. The value of this skill is reconciling several
sources that can each lie on their own, and surfacing the **deferred** and **blocked**
work that "0 open issues" hides.

## Steps

1. **Resolve intended scope from the authoritative roadmap.** Read `ROADMAP.md` — the
   release-direction table plus the per-version section. **Ignore
   `docs/archive/ROADMAP-2026-06-22.md`**: its version→scope mapping is stale and was
   reorganized (e.g. it maps v2.0 to "Social + Week 1", but the shipped v2.0 is
   "self-service groups"). While there, note what the roadmap says the **next** version
   explicitly defers _from_ this one (phrasing like "the membership/RLS hardening that
   vN deferred") — those are your prime leftover candidates.
2. **Pull the GitHub milestone truth.** `gh` is not on PATH and PowerShell mangles
   `--jq` expressions that contain spaces, so prepend the path and fetch `--json`, then
   process with `ConvertFrom-Json`:
   ```powershell
   $env:Path += ";C:\Program Files\GitHub CLI"
   # milestone open/closed counts
   gh api "repos/doughill1000/sunday_bets/milestones?state=all" | ConvertFrom-Json |
     ForEach-Object { "{0} [{1}] open={2} closed={3}" -f $_.title,$_.state,$_.open_issues,$_.closed_issues }
   # issues in the target milestone (all states)
   gh issue list --repo doughill1000/sunday_bets --milestone "vX" --state all --limit 100 `
     --json number,title,state,labels | ConvertFrom-Json
   # open PRs (catch loose work on the current branch) and releases
   gh pr list --repo doughill1000/sunday_bets --state open --json number,title,headRefName | ConvertFrom-Json
   gh release list --repo doughill1000/sunday_bets --limit 5
   ```
3. **Cross-check local signals so no single source fools you:** `package.json` version,
   `git tag --sort=-v:refname`, the latest `gh release`, and the newest `docs/CHANGELOG.md`
   entries. A version is **shipped** only when its milestone is open=0 **and** a matching
   Release is published. `package.json` already bumped to the _next_ version is the normal
   post-release state — not evidence the prior version is incomplete.
4. **Look past "0 open."** Build three buckets, not one count:
   - **Shipped** — closed issues in the milestone (cross-referenced with `docs/CHANGELOG.md`).
   - **Deferred** — work the roadmap/issues explicitly punted to the next milestone. Name it
     and say why (often an intentional scope cut), so Doug decides consciously rather than
     discovering it later.
   - **Blocked** — open issues carrying the `blocked` label, _with what unblocks them_. The
     common gate is an ADR under `docs/adr/` reaching **Accepted** (e.g. House grading is
     gated on ADR-0007); check that status.
5. **Summarize.** Lead with the verdict ("vX is shipped / not done"), then the
   deferred + blocked lists, and flag any **open PR on the current branch** that should be
   merged or closed before starting the next version.

## Remember

- `ROADMAP.md` is authoritative for version→scope; the **archived** roadmap is stale —
  never map versions from it.
- `gh` lives at `C:\Program Files\GitHub CLI`; in PowerShell fetch `--json` and use
  `ConvertFrom-Json` — `--jq` strings with spaces get split and fail.
- **"0 open issues" ≠ "nothing missing."** Always surface deferred-to-next and blocked work.
- Read-only by design. If a status finding warrants a GitHub write (relabel, milestone move,
  comment), **confirm with Doug first** — that is `scope-issue`/`issue-author` territory.

## See also

- `ROADMAP.md` (release direction), `docs/CHANGELOG.md` (shipped history),
  `docs/WORKFLOW.md` (delivery process)
- Sibling skills: `start-issue` (begin the next piece), `finish-pr` (close one out),
  `scope-issue` (triage what a leftover issue should become).
