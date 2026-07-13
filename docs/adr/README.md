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

| ADR                                                                         | Decision                                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [ADR-0001](0001-use-issue-led-delivery-and-adrs.md)                         | Use issue-led delivery and ADRs                                                                             |
| [ADR-0002](0002-group-tenancy-boundary.md)                                  | Group tenancy boundary and data model                                                                       |
| [ADR-0003](0003-schedule-source-and-game-identity.md)                       | Schedule source and game-identity / reconciliation model                                                    |
| [ADR-0004](0004-oauth-and-identity-linking.md)                              | Third-party (OAuth) sign-in and the single-identity / account-linking model                                 |
| [ADR-0005](0005-drop-worst-week-scoring.md)                                 | Drop-worst-week scoring (configurable per group)                                                            |
| [ADR-0006](0006-group-lifecycle-invites-and-membership.md)                  | Group lifecycle — creation gating, invites, and membership management                                       |
| [ADR-0007](0007-line-and-lock-grading-preset.md)                            | Line and lock grading preset (House vs Gamer)                                                               |
| [ADR-0008](0008-ai-foundation.md)                                           | AI integration foundation — gateway, voice-only boundary, output model, cost controls                       |
| [ADR-0009](0009-global-picks-fan-out.md)                                    | Global picks — write-time fan-out to all active groups                                                      |
| [ADR-0010](0010-production-release-gating.md)                               | Gate deploys behind version bumps via GitHub Actions                                                        |
| [ADR-0011](0011-grant-and-rls-baseline-pattern.md)                          | Closed-by-default grant/RLS baseline pattern                                                                |
| [ADR-0012](0012-migration-history-rebaseline.md)                            | Migration history rebaseline (squash) and simplified rollout                                                |
| [ADR-0013](0013-materialized-leaderboard-stats.md)                          | Leaderboard/stats served from materialized views refreshed on grading                                       |
| [ADR-0014](0014-auth-context-caching.md)                                    | Short-TTL per-instance cache of the per-request auth-hook lookups                                           |
| [ADR-0015](0015-versioning-and-release-policy.md)                           | Versioning and release policy (label-driven SemVer)                                                         |
| [ADR-0016](0016-non-scoring-rounds.md)                                      | Non-scoring rounds (`weeks.is_scoring`) and ESPN preseason sourcing                                         |
| [ADR-0017](0017-client-data-cache.md)                                       | Client-side stale-while-revalidate cache (TanStack Query) for read screens                                  |
| [ADR-0018](0018-non-retroactive-drop-worst-week.md)                         | Non-retroactive drop-worst-week scoping and standings reconciliation                                        |
| [ADR-0019](0019-pick-reveal-timing-model.md)                                | Configurable pick-reveal timing model and counts-only status carve-out                                      |
| [ADR-0020](0020-catch-up-mechanics.md)                                      | Catch-up mechanics — recognition, not a scoring equalizer                                                   |
| [ADR-0021](0021-caller-scoped-standings-rpc.md)                             | Caller-scoped `SECURITY DEFINER` standings RPC for non-web clients                                          |
| [ADR-0022](0022-over-under-totals-market.md)                                | Over/Under (totals) market — deferred; per-group season mode if built                                       |
| [ADR-0023](0023-all-in-signature-moment.md)                                 | All-In as a signature moment — pre-kickoff declaration carve-out and The Whale title                        |
| [ADR-0024](0024-grading-integrity-membership-penalty-and-frozen-seasons.md) | Missed-pick penalty scoped to active league membership; imported seasons frozen from grading                |
| [ADR-0025](0025-espn-final-scores-source.md)                                | ESPN scoreboard as the primary source of final scores (Odds API `/scores` fallback)                         |
| [ADR-0026](0026-public-demo-season-snapshot.md)                             | Public shareable demo season served from a generated read-only snapshot                                     |
| [ADR-0027](0027-rebrand-sunday-bets-to-hotshot.md)                          | Rebrand Sunday Bets → Hotshot (de-gamble the name; evolve charcoal + gold identity)                         |
| [ADR-0028](0028-in-app-feedback-tool.md)                                    | In-app feedback capture — store-first model, admin-gated GitHub egress, public-repo privacy                 |
| [ADR-0029](0029-design-system-token-architecture.md)                        | Design-system token architecture — typography/spacing/elevation/motion tokens + raw-hex guard               |
| [ADR-0030](0030-mobile-first-design-principles.md)                          | Mobile-first design principles — 390px canvas, one-pattern-per-job, disclosure depth (docs/DESIGN.md)       |
| [ADR-0031](0031-local-jwt-verification-hot-path.md)                         | Local JWT verification on the request hot path (replace per-navigation `getUser()`)                         |
| [ADR-0032](0032-cross-season-credibility-rating.md)                         | Cross-season credibility rating — vs-Market, conviction-weighted, soft season reset, hidden-until-qualified |
| [ADR-0033](0033-client-query-data-loading.md)                               | Client-query data loading — move page-load reads behind `+server.ts` (SPA-shell + API consolidation)        |

_The numbering is sequential; the next ADR is 0034._
