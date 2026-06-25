---
name: reconcile-blocked
description: Clear stale `blocked` labels by reconciling each blocked issue's stated dependency against what has actually shipped — read every open `blocked` issue's "Dependencies and ordering", check each prerequisite against docs/CHANGELOG.md (shipped issues) and docs/adr/ (ADR Status), then remove `blocked` (with a rationale comment) only where the gate is now satisfied. Use when Doug asks to "update the blocked issues", "unblock what's ready", "reconcile blocked labels", or "is anything still wrongly blocked?". This is the WRITE counterpart to the read-only `release-status` skill. It does NOT author issues (issue-author), start work (start-issue), or move milestones.
---

# Reconcile stale `blocked` labels

Triggered when Doug wants the `blocked` label set brought back in line with reality:
"update the blocked issues", "unblock anything whose dependency shipped", "are these
still blocked?". The output is a set of label removals + rationale comments — **a GitHub
write**, so it is gated on confirmation (see Remember).

The trap is treating `blocked` as static. An issue is blocked only until its stated
prerequisite ships; once that lands in `docs/CHANGELOG.md` (or the gating ADR reaches
`Accepted`), the label is stale and hides ready work. This skill closes that gap.
`release-status` _reports_ the stale labels; this skill _clears_ them.

## Steps

1. **Pull the live blocked set.** `gh` is not on PATH and PowerShell splits `--jq`
   strings with spaces — prepend the path and process JSON with `ConvertFrom-Json`:
   ```powershell
   $env:Path += ";C:\Program Files\GitHub CLI"
   gh issue list --repo doughill1000/sunday_bets --state open --label blocked --limit 100 `
     --json number,title,body,milestone | ConvertFrom-Json
   ```
2. **Extract each issue's gate.** Read the `### Dependencies and ordering` section of
   every blocked issue's body. The gate is usually one of:
   - **A specific issue** — e.g. "After v2.0-5 (#151)". Satisfied when #151 appears as
     shipped in `docs/CHANGELOG.md`.
   - **An ADR being Accepted** — e.g. "Blocked until ADR-0007 is Accepted". Satisfied
     when `head -5 docs/adr/0007-*.md` shows `Status: Accepted`.
   - **A milestone/epic condition** — e.g. "After multi-group is live (v2.0)". Satisfied
     when the track's issues (#147–#151 for v2.0 self-service groups) are all shipped.
3. **Check each gate against shipped truth.** `docs/CHANGELOG.md` is the authoritative
   shipped-to-`master` log (one entry per merged issue/PR). An issue number present there
   = shipped. For ADR gates, read the ADR's `Status:` line. Do not infer "shipped" from
   source code or a bumped `package.json`.
4. **Sort into unblock vs keep — and respect "research/deferred".** A blocked issue
   whose gate is **shipped code/an Accepted ADR** is an unblock. A blocked issue whose
   "blocker" is really an unmade **design decision** (research-stage items: "capture now,
   decide later", "post-v2.0", deps on _implementation_ not yet done) stays blocked —
   its label reflects a real open question, not stale bookkeeping. When in doubt, keep it
   blocked and list it as a judgment call rather than auto-clearing.
5. **Confirm, then write.** Present the unblock list + rationale per issue and the
   keep-blocked list, and get Doug's explicit go-ahead (the auto-mode classifier and
   `CLAUDE.md` both require confirmation for GitHub writes — do not try to route around a
   denial). Then, per unblocked issue:
   ```powershell
   gh issue edit <n>    --repo doughill1000/sunday_bets --remove-label "blocked"
   gh issue comment <n> --repo doughill1000/sunday_bets --body "Unblocking: <gate> satisfied — <shipped #NNN / ADR-XXXX Accepted> per docs/CHANGELOG.md."
   ```
6. **Verify.** Re-list `--label blocked` and confirm only the intended issues remain.

## Remember

- `gh` lives at `C:\Program Files\GitHub CLI`; in PowerShell fetch `--json` and use
  `ConvertFrom-Json` — `--jq` strings with spaces get split and fail. The Bash tool's
  `gh` also resolves once the path is added.
- **Shipped = in `docs/CHANGELOG.md`; ADR-gated = `Status: Accepted` in `docs/adr/`.**
  Never infer completion from code or a version bump.
- **Confirm before any write.** `CLAUDE.md` requires explicit approval for GitHub
  mutations and the classifier enforces it. If denied, stop and surface — let Doug decide.
- Keep research/deferred issues blocked. Their label encodes an open _decision_, which a
  shipped changelog entry does not resolve.
- Comment with the rationale on every relabel, so the audit trail explains _why_ it was
  unblocked and against which shipped artifact.

## See also

- `release-status` (read-only sibling that surfaces the stale `blocked` set and deferred
  work — run it first if you want the full picture before writing).
- `docs/CHANGELOG.md` (shipped history), `docs/adr/` (ADR statuses),
  `docs/WORKFLOW.md` (delivery process).
- `scope-issue` (decide what a still-blocked leftover should become),
  `start-issue` (begin work on a now-unblocked issue).
