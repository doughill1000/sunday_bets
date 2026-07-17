# Delivery Workflow

This workflow keeps product direction, live execution, and durable decisions in the
tools best suited to each job. It is designed for one maintainer running Claude and
Codex concurrently.

## Sources of truth

| Concern                                    | Source of truth                   |
| ------------------------------------------ | --------------------------------- |
| Product outcomes and release order         | [Roadmap](../ROADMAP.md)          |
| Executable scope and acceptance criteria   | GitHub Issue                      |
| Priority, agent ownership, and live status | GitHub Project                    |
| Release grouping                           | GitHub Milestone                  |
| Version impact of a change                 | `semver:` label (ADR-0015)        |
| Durable technical and fairness decisions   | [ADRs](adr/README.md)             |
| Implementation and verification            | Pull request                      |
| Shipped history (authoritative)            | GitHub Release                    |
| Shipped history (in-repo convenience log)  | [docs/CHANGELOG.md](CHANGELOG.md) |

Do not duplicate live status in the roadmap or ADRs. Links are preferable to copied
checklists.

## One-time GitHub setup

Create one repository Project with these fields:

- `Status`: Backlog, Ready, In progress, Review, Done
- `Agent`: Unassigned, Doug, Claude, Codex
- `Priority`: P0, P1, P2, P3
- `Area`: UI, Server, Database, Auth, DevOps, Docs
- `Risk`: Normal, Shared files, Database, Security, Gameplay rules

Use milestones for release names such as `v1.5`; do not duplicate releases as
labels. Useful labels are `type:feature`, `type:bug`, `type:decision`, and
`blocked`. Let the Project own status and agent assignment so two parallel tracking
systems cannot disagree.

## From idea to Ready

1. Add or revise a roadmap outcome only when product direction or release order
   changes.
2. Create an issue from the feature, bug, or decision template.
3. Split work when pieces can merge independently, have different dependencies, or
   would make file ownership clearer. Use a parent issue for the shared outcome.
4. Apply a milestone and dependencies. Issue authoring places the new item on the
   Project at `Status: Backlog`; the `Agent`, `Priority`, `Area`, and `Risk` fields are
   set at human triage (§"Claim and isolate work"), not at authoring.
5. Use `docs/adr/README.md` to decide whether an ADR is required.

An issue is Ready only when it has:

- one independently mergeable outcome and explicit exclusions;
- observable acceptance criteria;
- resolved dependencies or a documented integration order;
- an ADR link, governing ADR, or credible reason that no ADR is required;
- likely paths and shared/generated ownership called out;
- an Execution (model / effort) note recommending a model and effort level; and
- a verification plan appropriate to its risk.

## Natural-language issue requests

When Doug asks to "create," "open," or "file" an issue, to "create a feature" or
"feature issue," or to "add this to the backlog," the agent should author an issue
rather than begin implementation when no implementation behavior is requested:

1. Choose the matching template from `.github/ISSUE_TEMPLATE/`.
2. Inspect enough repository context to complete likely files, constraints,
   dependencies, verification, and the ADR decision credibly.
3. Present the completed issue title and body, plus the exact target repository.
4. Wait for explicit approval before the GitHub write. A direct instruction to skip
   the preview and create the issue counts as approval.
5. Create the issue through the connected GitHub app, report its URL, and stop unless
   implementation was also requested.

"Implement," "build," or "add" a feature means code work, not merely issue
creation. Planned implementation still starts from a Ready issue. If the same request
asks for both issue creation and implementation, create the approved issue first,
then use it as the implementation scope.

## ADR timing

For a high-risk or foundational decision, merge an ADR-only PR before implementation.
For a bounded decision, a Proposed ADR may travel with the implementation PR, but
material design feedback should be resolved before the implementation becomes costly
to change. Accepted ADRs are superseded, not silently rewritten.

The ADR records the chosen boundary and tradeoffs. The issue records the work needed
to implement it.

## Claim and isolate work

Before starting, read the relevant [agent context packs](agent-context/README.md) for
the areas the issue touches (auth, database, UI, testing) — they contain the
agent-facing rules that are most often gotten wrong and save re-discovery time.

Set the issue's `Agent` and `Status: In progress` before prompting an agent. This is
the claim that prevents Claude and Codex from starting the same work. Because GitHub
writes require confirmation, Doug should normally make this assignment during
triage; an agent must ask before changing it.

Each issue gets a fresh branch and sibling worktree from the latest remote trunk:

```powershell
git fetch origin
git worktree add ..\sunday_bets-codex-123 `
  -b codex/123-push-subscriptions origin/master

git worktree add ..\sunday_bets-claude-124 `
  -b claude/124-settings-page origin/master
```

The `.env*` files are gitignored, so a fresh worktree starts with none and cannot
reach Supabase / The Odds API until they are copied from the main checkout
(`.npmrc` is tracked, so it comes along automatically). Use the helper, which also
installs dependencies and prints the dev command:

```powershell
# Creates the worktree, copies every .env* (except .env.example), installs deps:
powershell -File scripts/new-worktree.ps1 -Branch claude/124-settings-page

# Add -Dev to also start the dev server on the chosen port:
powershell -File scripts/new-worktree.ps1 -Branch claude/124-settings-page -Port 5174 -Dev
```

Run a worktree's dev server **without switching repos** via pnpm's `-C` flag — use
a non-5173 port so it coexists with the main checkout's dev server. Don't put `--`
before `--port`: pnpm 10 forwards it as a literal token, which makes Vite treat
`--port` as a raw passthrough arg instead of a flag, so the override is silently
ignored.

```powershell
pnpm -C ..\sunday_bets-claude-124 run dev --port 5174
```

Never run both agents in the same worktree. The original checkout may contain other
work and must not be cleaned, reset, or repurposed by an agent.

A useful launch prompt is:

```text
Implement issue #123 in this worktree. Read AGENTS.md, docs/WORKFLOW.md, the full
issue, and linked ADRs first. Stay within the acceptance criteria, report scope
pressure instead of absorbing it, and finish with the required verification and a
PR-ready summary. Do not write to GitHub without confirmation.
```

## Parallel-work rules

Parallelize only when the issues' likely-file lists and durable decisions are
independent. Coordinate an integration order before either agent edits a shared
contract.

Serialize work that touches any of these unless one issue is explicitly based on the
other branch:

- `supabase/.migration-hash.json` and generated migrations;
- `src/lib/types/supabase.ts` after exposed schema changes;
- shared SQL objects or the same RLS/auth boundary;
- `pnpm-lock.yaml` or dependency upgrades; and
- shared planning, agent-instruction, or CI workflow files.

When one PR merges first, refresh the dependent branch from `origin/master`, rerun
its checks, and update generated artifacts from the combined state. Do not resolve a
migration-ledger conflict by choosing one side wholesale.

## Pull request and merge

1. Add the shipped-history entry as a fragment under
   [`docs/changelog.d/`](changelog.d/README.md) on the branch (not by editing
   `docs/CHANGELOG.md`), so it merges atomically with the PR (it lands in `master` only
   when the code does) and concurrent same-day PRs never collide on the shared file —
   keyed by issue number, or by PR number (`PR #NNN`) when the PR closes no issue — then
   open one PR and use `Closes #NNN` when there is a driving issue. `cut-release`
   assembles the fragments into `docs/CHANGELOG.md` at release time.
2. Link the governing or proposed ADR and explain any deviation from it.
3. Record commands that actually ran and explain skipped checks.
4. Move the Project item to Review.
5. Merge dependencies first. Refresh and reverify any branch based on older trunk.
6. Move the item to Done and let the issue close through the PR.
7. Remove the completed worktree after the branch is no longer needed:

```powershell
git worktree remove ..\sunday_bets-codex-123
git worktree prune
```

## Versioning

Versions follow SemVer and are **label-driven** (ADR-0015). A change's version impact
is decided once, at issue authoring, and consumed at release — agents never pick numbers
ad hoc:

- **major** — removes/renames a user-facing capability, a breaking data-model or auth
  change needing coordinated migration, or an epoch shift (single → multi-group was 2.0).
- **minor** — a new backward-compatible user-facing feature (most `type:feature`).
- **patch** — fix, perf, refactor, infra/CI, docs, or chore; the default for issue-less
  and ADR-only PRs.

`issue-author` assigns a `semver:` label + target milestone; `finish-pr` carries them
onto the PR and does **not** bump `package.json`; `cut-release` computes the release
version from the milestone's highest label and bumps `package.json` then. `package.json`
holds the **last shipped** version between releases. The date-grouped
[CHANGELOG](CHANGELOG.md) is unchanged; per-version notes are the auto-generated GitHub
Release (see below).

## Cutting a release

Production is gated (ADR-0010): Vercel's automatic Git deploys are off, so a plain merge
to `master` never ships. A release is a **single deliberate manual dispatch**. Run the
`cut-release` skill for the whole ritual.

- **Compute the version (ADR-0015):** base is the latest `v*` git tag, level is the
  highest `semver:` label across the milestone's issues (major > minor > patch; default
  patch). Feature PRs never bump `package.json`; `cut-release` bumps it in a dedicated
  release PR.
- **Release:** after the bump merges, run **Deploy Production → Run workflow**
  (`workflow_dispatch`). It runs the migration-ledger check → prod DB backup →
  `supabase db push` → `vercel build/deploy --prod` → tag `v<version>` + create the
  GitHub Release. Migrations run before the deploy so app and DB ship together; the
  version is read at dispatch to tag the Release (skipped if the tag exists).
- **Off-cycle cut:** the same dispatch ships current `master`; it tags whatever version
  `package.json` currently holds (skipped if that tag already exists).
- **Previews:** purely on demand — comment `/preview` on a PR to deploy one. Nothing
  deploys automatically on open, ready, reopen, or push.

At release time, close the milestone and refine the auto-generated `v<version>` GitHub
Release notes. Update the roadmap only when the direction or ordering changed, not to
mirror completed issue status.
