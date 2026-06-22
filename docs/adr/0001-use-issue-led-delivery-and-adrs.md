# ADR-0001: Use issue-led delivery and ADRs

- Status: Accepted
- Date: 2026-06-22
- Issue: None (repository workflow adoption)
- Supersedes: None

## Context

The original `ROADMAP.md` accumulated product direction, release status, completed
history, detailed feature specifications, and implementation tasks. That made it
useful as a brainstorm but unreliable as an execution system. Status became stale,
and two coding agents could not safely claim independent work from one markdown
checklist.

Sunday Bets needs a workflow that supports one maintainer using Claude and Codex in
parallel without losing durable reasoning or creating overlapping branches.

## Decision

Use a layered planning and delivery model:

- `ROADMAP.md` communicates product outcomes and release order only.
- GitHub Milestones group work by release.
- GitHub Issues are the source of truth for executable scope, dependencies, and
  acceptance criteria.
- The GitHub Project is the source of truth for priority, agent ownership, and live
  status.
- ADRs in `docs/adr/` record durable architecture and gameplay-fairness decisions.
- Pull requests implement one primary issue, link relevant ADRs, and report actual
  verification.
- GitHub Releases record shipped history.

Parallel implementation uses one issue, branch, and worktree per agent. Work that
touches shared generated state, especially the Supabase migration ledger and types,
is serialized unless an explicit integration order is agreed first.

## Consequences

Planning state becomes visible and claimable without editing the same file. Agents
receive smaller scopes with testable completion conditions, while decisions remain
versioned beside the code they constrain.

This adds triage work: issues need to be made Ready, significant decisions need an
ADR, and the GitHub Project needs routine status updates. GitHub contains live
execution state, so the repository alone no longer answers who is working on an
item. The roadmap must resist growing back into a second backlog.

## Alternatives considered

- Keep all planning in `ROADMAP.md`: simple and local, but weak for ownership,
  concurrency, dependencies, and current status.
- Move everything into GitHub Issues: strong for execution, but poor for concise
  product direction and durable architectural reasoning.
- Use agent-specific task files: reduces immediate collisions but creates multiple
  competing backlogs and makes handoff harder.

## Follow-up

Create the GitHub Project fields and labels described in the
[delivery workflow](../WORKFLOW.md), then migrate active items from the
[archived roadmap](../archive/ROADMAP-2026-06-22.md) into independently mergeable
issues. Archive details are reference material, not an active queue.
