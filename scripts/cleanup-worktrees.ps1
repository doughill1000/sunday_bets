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

  Removal uses `git worktree remove --force` and then deletes the directory
  directly when git leaves gitignored files (node_modules, copied .env*) behind
  -- the usual Windows "Directory not empty" failure -- using a robocopy fallback
  for paths that exceed the 260-char limit. Any pre-existing orphaned worktree
  directories (left by an earlier failed removal, no longer tracked by git) are
  reported so they can be cleaned up by hand.

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

# Delete a directory, tolerating Windows' MAX_PATH (260 char) limit that trips
# Remove-Item on the deeply nested node_modules/.pnpm paths a worktree carries.
# Falls back to mirroring an empty directory over the target with robocopy, which
# uses long-path-aware APIs, then removes the now-flattened directory.
function Remove-DirRobust {
  param([Parameter(Mandatory)][string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $true }
  try {
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    return $true
  } catch {
    $empty = Join-Path ([System.IO.Path]::GetTempPath()) ("wt_empty_" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $empty | Out-Null
    try {
      # robocopy exit codes 0-7 are success; only >= 8 signals a real failure.
      robocopy $empty $Path /MIR /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
      if ($LASTEXITCODE -ge 8) { return $false }
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
    } finally {
      Remove-Item -LiteralPath $empty -Recurse -Force -ErrorAction SilentlyContinue
    }
    return (-not (Test-Path -LiteralPath $Path))
  }
}

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

# The main checkout is the FIRST entry git reports -- never a removal candidate.
# (Don't assume it's this script's directory: the script may be invoked from a
# linked worktree, in which case its parent is NOT the main checkout.)
$mainPath = if ($worktrees.Count) {
  try { (Resolve-Path $worktrees[0].Path -ErrorAction Stop).Path } catch { $worktrees[0].Path }
} else { (Resolve-Path $root).Path }

# Detect orphaned worktree directories: sibling folders that still carry a linked
# worktree's `.git` file but that git no longer tracks (e.g. left by a failed
# removal before this script handled long paths). Their branch/merge status is no
# longer recoverable, so we report them rather than auto-deleting.
$trackedPaths = $worktrees | ForEach-Object { try { (Resolve-Path $_.Path -ErrorAction Stop).Path } catch { $_.Path } }
$orphans = @()
foreach ($dir in (Get-ChildItem -LiteralPath (Split-Path $mainPath -Parent) -Directory -ErrorAction SilentlyContinue)) {
  $gitFile = Join-Path $dir.FullName '.git'
  if ((Test-Path -LiteralPath $gitFile -PathType Leaf) -and ($trackedPaths -notcontains $dir.FullName)) {
    $orphans += $dir.FullName
  }
}

$toRemove = @()
foreach ($wt in $worktrees) {
  $pathFull = try { (Resolve-Path $wt.Path -ErrorAction Stop).Path } catch { $wt.Path }

  if ($wt.Bare) { continue }
  if ($pathFull -eq $mainPath) { continue }            # main checkout, never remove
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

# Report orphaned directories regardless of -Force (dry run surfaces them too).
if ($orphans) {
  Write-Host ""
  Write-Warning "Orphaned worktree directories (git no longer tracks these):"
  $orphans | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
  Write-Host "    Confirm they're not needed, then delete by hand, e.g.:" -ForegroundColor DarkGray
  Write-Host "    Remove-Item -LiteralPath '<path>' -Recurse -Force" -ForegroundColor DarkGray
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
  Write-Host "==> removing worktree $($r.Path) [$($r.Branch)]" -ForegroundColor Cyan
  # --force is required because the worktree carries gitignored files
  # (node_modules, copied .env*) that plain `remove` refuses to discard.
  #
  # On Windows this command writes to stderr AND exits non-zero whenever git
  # leaves those ignored files behind ("Directory not empty"). Under this
  # script's $ErrorActionPreference='Stop', PowerShell 5.1 promotes that stderr
  # to a *terminating* NativeCommandError -- which `2>$null` does NOT suppress --
  # aborting the whole loop before the Remove-DirRobust fallback below ever runs.
  # Swallow it with try/catch so the loop continues; $LASTEXITCODE is still set.
  try { git -C $root worktree remove --force $r.Path 2>$null } catch { }
  # git deleted the tracked files but left the ignored ones, so the final rmdir
  # failed. Finish the job ourselves, then prune so git drops its now-dangling
  # administrative reference.
  if (($LASTEXITCODE -ne 0) -or (Test-Path -LiteralPath $r.Path)) {
    Write-Host "    git left files behind; removing directory directly" -ForegroundColor DarkGray
    if (-not (Remove-DirRobust -Path $r.Path)) {
      Write-Warning "    could not fully delete $($r.Path) -- left in place"
      continue
    }
    try { git -C $root worktree prune } catch { }
  }
  # Delete the now-orphaned local branch (its work is in trunk).
  try { git -C $root branch -D $r.Branch 2>$null | Out-Null } catch { }
}

Write-Host "==> git worktree prune" -ForegroundColor Cyan
git -C $root worktree prune

Write-Host ""
Write-Host "Done. Remaining worktrees:" -ForegroundColor Green
git -C $root worktree list
