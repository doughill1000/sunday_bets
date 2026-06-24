#!/usr/bin/env pwsh
#requires -Version 5.1
<#
.SYNOPSIS
  Remove sibling git worktrees whose branch has already been merged into
  origin/master, after verifying each one is clean (no uncommitted or unpushed
  work). Prints a plan first; pass -Force to actually remove.

.DESCRIPTION
  This repo merges PRs with merge commits (not squash), so a merged branch's
  tip is an ancestor of origin/master. That is the primary "safe to delete"
  signal; the GitHub PR state (via `gh`, if available) is used as a fallback so
  squash/rebase merges are still detected.

  A worktree is ONLY removed when ALL of these hold:
    - it is not the main checkout (never touch the primary working copy)
    - its branch is merged (ancestor of origin/master, or its PR is MERGED)
    - it has no uncommitted changes and no commits missing from origin/master

  Anything dirty, unmerged, or unpushed is reported and left alone. Never clean
  another agent's in-progress worktree -- run this only against your own.

.EXAMPLE
  # Show which merged worktrees WOULD be removed (default; nothing deleted):
  powershell -File scripts/cleanup-worktrees.ps1

.EXAMPLE
  # Actually remove the merged, clean worktrees:
  powershell -File scripts/cleanup-worktrees.ps1 -Force
#>
[CmdletBinding()]
param(
  # Trunk branch merged work lands on. Defaults to origin/master.
  [string] $Trunk = 'origin/master',

  # Perform the removals. Without this, the script only prints the plan.
  [switch] $Force,

  # Skip `git fetch origin` (use already-fetched refs).
  [switch] $NoFetch
)

$ErrorActionPreference = 'Stop'

# Repo root is the parent of this script's directory (<root>/scripts/..).
$root = Split-Path $PSScriptRoot -Parent

if (-not $NoFetch) {
  Write-Host "==> git fetch --prune origin" -ForegroundColor Cyan
  git -C $root fetch --prune origin
  if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }
}

# Resolve the trunk tip once.
$trunkSha = (git -C $root rev-parse --verify $Trunk).Trim()
if ($LASTEXITCODE -ne 0) { throw "cannot resolve trunk ref '$Trunk'" }

$hasGh = [bool](Get-Command gh -ErrorAction SilentlyContinue)

# Parse `git worktree list --porcelain` into objects.
$worktrees = @()
$cur = $null
foreach ($line in (git -C $root worktree list --porcelain)) {
  if ($line -like 'worktree *') {
    if ($cur) { $worktrees += $cur }
    $cur = [pscustomobject]@{ Path = $line.Substring(9); Branch = $null; Bare = $false; Detached = $false }
  } elseif ($line -like 'branch *') {
    $cur.Branch = $line.Substring(7) -replace '^refs/heads/', ''
  } elseif ($line -eq 'bare') {
    $cur.Bare = $true
  } elseif ($line -eq 'detached') {
    $cur.Detached = $true
  }
}
if ($cur) { $worktrees += $cur }

# The main checkout is this repo root -- never a removal candidate.
$rootFull = (Resolve-Path $root).Path

$toRemove = @()
foreach ($wt in $worktrees) {
  $pathFull = try { (Resolve-Path $wt.Path -ErrorAction Stop).Path } catch { $wt.Path }

  if ($wt.Bare) { continue }
  if ($pathFull -eq $rootFull) { continue }            # main checkout
  if ($wt.Detached -or -not $wt.Branch) {
    Write-Warning "SKIP  $($wt.Path) -- detached HEAD / no branch (clean up by hand)"
    continue
  }

  $branch = $wt.Branch

  # Merged? Primary: branch tip is an ancestor of trunk.
  git -C $root merge-base --is-ancestor $branch $trunkSha 2>$null
  $merged = ($LASTEXITCODE -eq 0)

  # Fallback: GitHub PR for this branch is MERGED (catches squash/rebase merges).
  # gh writes to stderr when no PR exists; under -ErrorAction Stop that becomes a
  # terminating NativeCommandError in PS 5.1, so isolate it and swallow failures.
  if (-not $merged -and $hasGh) {
    $state = $null
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $state = (& gh pr view $branch --json state -q .state 2>$null)
    } catch { } finally { $ErrorActionPreference = $prevEap }
    if ($state -eq 'MERGED') { $merged = $true }
  }

  if (-not $merged) {
    Write-Host "KEEP  $($wt.Path) [$branch] -- not merged into $Trunk" -ForegroundColor DarkGray
    continue
  }

  # Dirty working tree?
  $dirty = git -C $pathFull status --porcelain
  if ($dirty) {
    Write-Warning "SKIP  $($wt.Path) [$branch] -- MERGED but has uncommitted changes"
    continue
  }

  # Commits on the branch not yet on trunk (unpushed/unmerged work)?
  $ahead = (git -C $root rev-list --count "$trunkSha..$branch" 2>$null)
  if ($ahead -and [int]$ahead -gt 0) {
    Write-Warning "SKIP  $($wt.Path) [$branch] -- $ahead commit(s) not in $Trunk (verify before deleting)"
    continue
  }

  $toRemove += [pscustomobject]@{ Path = $pathFull; Branch = $branch }
}

if ($toRemove.Count -eq 0) {
  Write-Host ""
  Write-Host "Nothing to clean up -- no merged, clean worktrees found." -ForegroundColor Green
  return
}

Write-Host ""
Write-Host "Merged & clean -- removal candidates:" -ForegroundColor Cyan
$toRemove | ForEach-Object { Write-Host "    $($_.Path) [$($_.Branch)]" }

if (-not $Force) {
  Write-Host ""
  Write-Host "Dry run (no changes made). Re-run with -Force to remove these." -ForegroundColor Yellow
  return
}

Write-Host ""
foreach ($r in $toRemove) {
  Write-Host "==> git worktree remove `"$($r.Path)`"" -ForegroundColor Cyan
  git -C $root worktree remove $r.Path
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "    failed to remove $($r.Path) -- left in place"
    continue
  }
  # Delete the now-orphaned local branch (its work is in trunk).
  git -C $root branch -D $r.Branch 2>$null | Out-Null
}

Write-Host "==> git worktree prune" -ForegroundColor Cyan
git -C $root worktree prune

Write-Host ""
Write-Host "Done. Remaining worktrees:" -ForegroundColor Green
git -C $root worktree list
