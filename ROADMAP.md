# Hotshot Roadmap

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

| Release | Outcome                                                     | State   |
| ------- | ----------------------------------------------------------- | ------- |
| v1.2    | Reliability, cleanup, auth unification, and quota tracking  | Shipped |
| v1.3    | E2E safety net and Svelte 5 migration                       | Shipped |
| v1.4    | Automated odds sync, grading, and week rollover             | Shipped |
| v1.5    | Push notifications and player notification preferences      | Shipped |
| v1.6    | Stats, history, and operational cleanup                     | Shipped |
| v1.7    | Group tenancy foundation (internal; original group only)    | Shipped |
| v1.8    | Season launch — social play and configurable gameplay rules | Shipped |
| v1.9    | New-player onboarding and a pre-v2 regression safety net    | Now     |
| v2.0    | Self-service groups (create, join, invite, switch)          | Next    |
| v2.1    | Commissioner depth, House grading, and engagement polish    | Planned |

Dates belong on milestones and issues, where they can be revised without turning
this strategy document into a second project board.

The product's defining boundary is single-group → multi-group, not the version
number. The tenancy foundation (v1.7) lands first and invisibly so that the social
and gameplay-rule features in v1.8 are built group-aware from the start and never
need a later `group_id` retrofit. v2.0 marks the groups epoch, where members
create, join, and switch between groups; v1.9 is the deliberate on-ramp that ships
a regression safety net and onboarding before those access paths change.

## Now

### v1.9 - Onboarding and a pre-v2 safety net

Ship the two safe, self-contained pieces before the multi-group access paths change: a
new-player "How to Play" onboarding guide, and a regression test suite that locks in
current gameplay, group-isolation, and self-sign-up behavior. This is the on-ramp — it
gives the v2.0 refactor a net to land on.

## Next

### v2.0 - Self-service groups

Add create, join, invite, and group-switching flows now that the tenancy foundation is
proven, using expiring single-use tokens or shareable codes rather than exposed user
IDs. A user may belong to multiple groups; commissioners manage their group's name and
members. Because v1.7 already established the data model, the remaining work is UI and
access, not a schema retrofit: one invite table, the create/redeem RPCs, commissioner
write policies, and a persisted active-group selection.

## Planned

### v2.1 - Commissioner depth, House grading, and engagement

Give commissioners per-group rules editing and the membership/RLS hardening that v2.0
deferred; add the House closing-line grading preset (every member graded on the same
number) once its decision is Accepted; and layer in engagement polish (install and
notification nudges, pick-and-results reminders).

## Off the dated roadmap

These tracks are real work but are deliberately not tied to a version, so the release
line stays honest about what is committed.

- **Scaling (measurement-gated).** Observability first to define "measured scale," then
  response caching, bounded and paginated leaderboards, and operational alerts and
  load-testing — each triggered by a metric crossing a threshold, not by a date. This
  honors the guardrail that infrastructure is revisited only from measurements. The
  baseline signals and their Tier A/B trigger thresholds are defined in
  [`docs/observability/scaling-signals.md`](docs/observability/scaling-signals.md).
- **Gameplay decisions and research.** Catch-up mechanics, auto-pick defaults, and the
  more experimental scoring and side-game ideas stay in a decide-when-wanted backlog;
  each is gated on writing and accepting its ADR before any build.
- **AI (research spike).** A data-only "starter" exploration with a measured-cost spike
  and a foundation ADR, pulled in only when there is appetite to invest.

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
