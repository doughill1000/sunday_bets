# Hotshot Roadmap

This file communicates durable product direction — the boundary the product is built
around and the constraints that don't change release to release. It is deliberately
not a task tracker and does not track release status: GitHub Milestones are the
source of truth for release order and what shipped in which version.

- GitHub Issues define executable work and acceptance criteria.
- The GitHub Project shows priority, ownership, and current status.
- GitHub Milestones group issues into releases.
- `docs/adr/` records durable technical and product-architecture decisions.
- GitHub Releases record what shipped.

See the [delivery workflow](docs/WORKFLOW.md) for the complete process. The
[detailed prior roadmap](docs/archive/ROADMAP-2026-06-22.md) is preserved as
migration material only.

## The defining boundary

The product's defining boundary is single-group → multi-group, not the version
number. The tenancy foundation (v1.7) landed first and invisibly so that the social
and gameplay-rule features in v1.8 were built group-aware from the start and never
needed a later `group_id` retrofit. v2.0 marked the groups epoch, where members
create, join, and switch between groups. Any change that touches group membership,
ownership, or scoping should be read against this boundary first.

## Off the dated roadmap

These tracks are real work but are deliberately not tied to a version, so milestone
sequencing stays honest about what is committed.

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
