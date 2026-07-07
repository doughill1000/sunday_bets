#!/usr/bin/env pwsh
#requires -Version 5.1
<#
.SYNOPSIS
  Create a sibling git worktree from a freshly fetched origin/master, copy the
  gitignored local .env* files into it, install dependencies, and (optionally)
  launch the dev server on a non-default port.

.DESCRIPTION
  New worktrees do NOT contain the .env* files because they are gitignored
  (see .gitignore: ".env" / ".env.*", except ".env.example"). Without them the
  worktree cannot talk to Supabase / The Odds API. This script copies every
  .env* file (except the tracked .env.example) from the main checkout so the
  worktree is runnable immediately.

  Run dev without leaving your current repo by using pnpm's -C flag -- see the
  command this script prints when it finishes.

.EXAMPLE
  # Create ..\sunday_bets-claude-124-settings on a new branch, install, copy env:
  powershell -File scripts/new-worktree.ps1 -Branch claude/124-settings-page

.EXAMPLE
  # Same, but also start dev on port 5174 (so it coexists with the main repo's 5173):
  powershell -File scripts/new-worktree.ps1 -Branch claude/124-settings-page -Port 5174 -Dev
#>
[CmdletBinding()]
param(
  # New branch name, e.g. claude/124-settings-page (also drives the worktree dir name).
  [Parameter(Mandatory)] [string] $Branch,

  # Worktree path. Defaults to a sibling: ..\sunday_bets-<branch-slug>.
  [string] $Path,

  # Dev-server port for the printed/-Dev command. Use a non-5173 port to coexist
  # with the main repo's dev server.
  [int] $Port = 5174,

  # Branch base. Defaults to the freshly fetched origin/master (trunk).
  [string] $Base = 'origin/master',

  # Start the dev server after setup (otherwise just prints the command).
  [switch] $Dev,

  # Skip `pnpm install` in the new worktree.
  [switch] $NoInstall
)

# Deliberately NOT 'Stop'. git/pnpm write progress to stderr; if a caller runs this script
# under `2>&1` (e.g. to trim output), PowerShell 5.1 wraps that benign stderr as an
# ErrorRecord that 'Stop' turns into a terminating error — aborting right after
# `git worktree add`, before the env-copy and install steps run. We guard every native
# call explicitly via $LASTEXITCODE + `throw` below (throw terminates regardless of this
# preference), so real failures still stop the script whether or not the caller redirects.
$ErrorActionPreference = 'Continue'

# Repo root is the parent of this script's directory (<root>/scripts/..).
$root = Split-Path $PSScriptRoot -Parent

if (-not $Path) {
  $slug = ($Branch -replace '[\\/]', '-')
  $Path = Join-Path (Split-Path $root -Parent) "sunday_bets-$slug"
}

Write-Host "==> git fetch origin" -ForegroundColor Cyan
git -C $root fetch origin
if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

Write-Host "==> git worktree add `"$Path`" -b $Branch $Base" -ForegroundColor Cyan
git -C $root worktree add $Path -b $Branch $Base
if ($LASTEXITCODE -ne 0) { throw "git worktree add failed" }

Write-Host "==> Copying gitignored .env* files into the worktree" -ForegroundColor Cyan
$copied = 0
Get-ChildItem -Path $root -Filter '.env*' -File -Force |
  Where-Object { $_.Name -ne '.env.example' } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Path $_.Name) -Force -ErrorAction Stop
    Write-Host "    + $($_.Name)"
    $copied++
  }
if ($copied -eq 0) {
  Write-Warning "No .env* files found in $root - the worktree may not be runnable."
}

if (-not $NoInstall) {
  Write-Host "==> pnpm -C `"$Path`" install" -ForegroundColor Cyan
  pnpm -C $Path install
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
}

$devCmd = "pnpm -C `"$Path`" run dev -- --port $Port"
Write-Host ""
Write-Host "Worktree ready: $Path" -ForegroundColor Green
Write-Host "Run dev from anywhere (no need to cd into the worktree):" -ForegroundColor Green
Write-Host "    $devCmd" -ForegroundColor Green

if ($Dev) {
  Write-Host ""
  Write-Host "==> $devCmd" -ForegroundColor Cyan
  pnpm -C $Path run dev -- --port $Port
}
