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

| Release | Outcome                                                       | State   |
| ------- | ------------------------------------------------------------- | ------- |
| v1.2    | Reliability, cleanup, auth unification, and quota tracking    | Shipped |
| v1.3    | E2E safety net and Svelte 5 migration                         | Shipped |
| v1.4    | Automated odds sync, grading, and week rollover               | Shipped |
| v1.5    | Push notifications and player notification preferences        | Shipped |
| v1.6    | Stats, history, and operational cleanup                       | Shipped |
| v1.7    | Group tenancy foundation (internal; original group only)      | Shipped |
| v1.8    | Season launch — social play and configurable gameplay rules   | Now     |
| v2.0    | Self-service groups and scaling                               | Later   |

Dates belong on milestones and issues, where they can be revised without turning
this strategy document into a second project board.

The product's defining boundary is single-group → multi-group, not the version
number. The tenancy foundation (v1.7) lands first and invisibly so that the social
and gameplay-rule features in v1.8 are built group-aware from the start and never
need a later `group_id` retrofit. v2.0 marks the groups epoch, where members
create, join, and switch between groups.

## Now

### v1.8 - Season launch

Ship the 2026 launch as one combined release built on the v1.7 foundation: scale the
original group beyond six players, reveal other players' picks after kickoff, add
group-scoped comments and reactions, and support password authentication alongside
magic links. Layer in configurable gameplay rules — drop-worst-week scoring, per-week
rule overrides (special weeks) keyed by group and week, and the House/Gamer
line-grading preset. Hold a launch-blocking cut line: social core plus the safe,
independently shippable rules (drop-worst-week, multiplier weeks) must ship for Week 1;
fairness-sensitive rules (line locking, catch-up mechanics) can follow during the
season and each require an ADR before implementation with explicit examples in their
issue acceptance criteria.

## Later

### v2.0 - Self-service groups and scaling

Add create, join, invite, and group-switching flows once the tenancy foundation is
proven, using expiring single-use tokens or shareable codes rather than exposed user
IDs. A user may belong to multiple groups; commissioners manage their group's name,
members, and rules. Because v1.7 already established the data model, the remaining work
is UI and access, not a schema retrofit. Bound leaderboard work with SQL summaries and
paginated member lists, and revisit infrastructure only from measured scale.

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

## Shipped

### v1.7 - Group tenancy foundation

Introduced `groups` and `group_memberships` and added `group_id` to picks,
settlements, leaderboards, and gameplay configuration while keeping canonical NFL
games, lines, scores, and ingestion global. Membership is the RLS boundary. The
original Sunday Bets group was backfilled with all history and standings unchanged.
Invisible to players: the sole membership is auto-selected and group switching is
held behind a stopgap (`DEFAULT_GROUP_ID`) until v2.0 wires `active_group_id`
resolution.

### v1.6 - Stats and history

Added historical views over `pick_settlement` and a player-facing stats experience.
Leaderboard aggregation kept in Postgres; uses `getWeeklyCumulative()` for the
season trend.

## Parked

Parked work should remain a GitHub Issue with a clear reason and no active milestone.
Current themes include legacy `results`/`totals` removal, backfill-script cleanup,
grant hardening, and migration-generator rework. Promote an item by moving its issue
to Ready and assigning an owner; do not expand it here.
