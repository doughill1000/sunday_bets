# Architecture Decision Records

ADRs capture decisions that would otherwise be rediscovered from code or old pull
requests. They explain why a durable choice was made, its tradeoffs, and how a later
decision may replace it.

## When an ADR is required

Create an ADR when a change does any of the following:

- changes authentication, authorization, RLS, or another trust boundary;
- introduces or replaces a persistent data model, external service, framework, or
  cross-cutting application pattern;
- changes gameplay fairness or scoring semantics;
- creates a constraint that will affect multiple future features; or
- is costly, risky, or operationally difficult to reverse.

An ADR is normally unnecessary for a local implementation detail, dependency patch,
small bug fix, or a choice already governed by an accepted ADR.

When uncertain, note the decision in the issue and ask during triage. Do not create
an ADR merely to restate the implementation.

## Lifecycle

1. Copy `0000-template.md` to the next available four-digit number and a short
   kebab-case title.
2. Set the status to `Proposed`, link the driving issue (or, when there is none,
   record an explicit "no issue — approved plan" rationale on the `Issue:` line, as
   ADR-0010 does), and open it with or before the implementation PR.
3. Resolve material design feedback before implementation becomes hard to unwind.
4. Set the status to `Accepted` when maintainers approve the decision.
5. Do not rewrite an accepted decision to match new reality. Add a new ADR with
   `Supersedes: ADR-NNNN` and mark the old record `Superseded by ADR-NNNN`.

Allowed statuses are `Proposed`, `Accepted`, `Rejected`, and
`Superseded by ADR-NNNN`. Typo and link corrections do not require supersession.

## Index

Each ADR's authoritative **status lives in its own file header** (the `- Status:`
line); this index intentionally does not repeat it, so the two cannot drift — per the
"don't duplicate live status" rule in `docs/WORKFLOW.md`. Open the linked ADR for its
current status.

| ADR                                                        | Decision                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| [ADR-0001](0001-use-issue-led-delivery-and-adrs.md)        | Use issue-led delivery and ADRs                                             |
| [ADR-0002](0002-group-tenancy-boundary.md)                 | Group tenancy boundary and data model                                       |
| [ADR-0003](0003-schedule-source-and-game-identity.md)      | Schedule source and game-identity / reconciliation model                    |
| [ADR-0004](0004-oauth-and-identity-linking.md)             | Third-party (OAuth) sign-in and the single-identity / account-linking model |
| [ADR-0005](0005-drop-worst-week-scoring.md)                | Drop-worst-week scoring (configurable per group)                            |
| [ADR-0006](0006-group-lifecycle-invites-and-membership.md) | Group lifecycle — creation gating, invites, and membership management       |
| [ADR-0007](0007-line-and-lock-grading-preset.md)           | Line and lock grading preset (House vs Gamer)                               |
| [ADR-0009](0009-global-picks-fan-out.md)                   | Global picks — write-time fan-out to all active groups                      |
| [ADR-0010](0010-production-release-gating.md)              | Gate deploys behind version bumps via GitHub Actions                        |
| [ADR-0011](0011-grant-and-rls-baseline-pattern.md)         | Closed-by-default grant/RLS baseline pattern                                |
| [ADR-0012](0012-migration-history-rebaseline.md)           | Migration history rebaseline (squash) and simplified rollout                |
| [ADR-0013](0013-materialized-leaderboard-stats.md)         | Leaderboard/stats served from materialized views refreshed on grading       |

_ADR-0008 was never used — the number was skipped, so there is no `0008-*.md` record._
