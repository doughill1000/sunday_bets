# Sunday Bets Roadmap

This file communicates product direction and release order. It is deliberately
not a task tracker.

- GitHub Issues define executable work and acceptance criteria.
- The GitHub Project shows priority, ownership, and current status.
- GitHub Milestones group issues into releases.
- `docs/adr/` records durable technical and product-architecture decisions.
- GitHub Releases record what shipped.

See the [delivery workflow](docs/WORKFLOW.md) for the complete process. The
[detailed prior roadmap](docs/archive/ROADMAP-2026-06-22.md) is preserved as
migration material only.

## Release direction

| Release | Outcome                                                    | State   |
| ------- | ---------------------------------------------------------- | ------- |
| v1.2    | Reliability, cleanup, auth unification, and quota tracking | Shipped |
| v1.3    | E2E safety net and Svelte 5 migration                      | Shipped |
| v1.4    | Automated odds sync, grading, and week rollover            | Shipped |
| v1.5    | Push notifications and player notification preferences     | Shipped |
| v1.6    | Stats, history, and operational cleanup                    | Now     |
| v2.0    | Social play and 2026 season launch readiness               | Next    |
| v2.1    | Configurable gameplay rules and engagement mechanics       | Later   |
| v2.2    | Group tenancy foundation                                   | Later   |
| v2.3    | Self-service groups                                        | Later   |

Dates belong on milestones and issues, where they can be revised without turning
this strategy document into a second project board.

## Now

### v1.6 - Stats and history

Add historical views over `pick_settlement` and a player-facing stats experience.
Keep leaderboard aggregation in Postgres and consume the intentionally reserved
`getWeeklyCumulative()` query for the season trend.

## Next

### v2.0 - Social and season launch

Scale the original group beyond six players, reveal other players' picks after
kickoff, add game-scoped comments and reactions, support password authentication
alongside magic links, and complete the 2026 launch checklist.

## Later

### v2.1 - Gameplay rules

Explore drop-worst-week scoring, consistent line-grading presets, optional catch-up
mechanics, and per-week rule overrides. Fairness-sensitive rule changes require an
ADR before implementation and explicit examples in their issue acceptance criteria.

### v2.2 - Group tenancy foundation

Introduce groups and memberships while keeping canonical NFL games, lines, scores,
and ingestion global. Membership becomes the RLS boundary. Preserve all historical
standings when backfilling the original Sunday Bets group.

### v2.3 - Self-service groups

Add create, join, invite, and group-switching flows after the tenancy foundation is
proven. Gameplay settings become group-owned while operational settings remain
global.

## Architectural guardrails

These are constraints, not backlog items. Any change to them requires an ADR that
supersedes the relevant prior decision.

- Keep SvelteKit/Vercel with Supabase Auth, Postgres, and RLS until measurements
  justify a change.
- Keep cookie-based web sessions. A future native API may also accept Supabase bearer
  tokens through versioned endpoints and stable DTOs.
- Keep atomic pick locking, grading, and settlement close to Postgres. Keep external
  HTTP calls and orchestration in server-only SvelteKit code.
- Keep user request paths on the request-scoped Supabase client. Reserve the service
  role for cron, ingestion, grading, and narrowly defined admin operations.
- New Data API tables require explicit grants, RLS, policies, and permission tests.
- Bound group-owned queries with `group_id` filters and leading indexes; RLS is not a
  query-performance strategy.
- Revisit queues or hosting only for demonstrated scale, cost, compliance, regional,
  or networking needs.

## Parked

Parked work should remain a GitHub Issue with a clear reason and no active milestone.
Current themes include legacy `results`/`totals` removal, backfill-script cleanup,
grant hardening, and migration-generator rework. Promote an item by moving its issue
to Ready and assigning an owner; do not expand it here.
