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

| Release    | Outcome                                                                                 | State   |
| ---------- | --------------------------------------------------------------------------------------- | ------- |
| v1.2–v1.8  | Reliability → automation → notifications → stats → group tenancy → social season launch | Shipped |
| v1.9       | New-player onboarding and a pre-v2 regression safety net                                | Shipped |
| v2.0       | Self-service groups (create, join, invite, switch)                                      | Shipped |
| v2.1–v2.3  | Commissioner depth, House grading preset, global picks, engagement polish               | Shipped |
| v2.4       | Non-scoring rounds, AI foundation (ADR-0008), label-driven releases                     | Shipped |
| v2.5–v2.7  | League identity: honors, badges, lifetime H2H, weekly AI recap waves, PWA speed         | Shipped |
| v2.8       | Season Wrapped, non-retroactive drop-worst-week, recap push                             | Shipped |
| v2.9       | The reveal ritual — reveal-timing decision (#383) + synchronized kickoff reveal (#359)  | Now     |
| v2.10      | All-In as a signature moment (#360) + 2026 season-readiness patches                     | Next    |
| v2.11      | The Sunday live layer — sweat board (#386), nudge board (#388), share card (#389)       | Planned |
| v2.12      | The league history layer — weekly hardware & records book (#387), career rating (#361)  | Planned |
| Season end | Shareable Wrapped acquisition loop (#348, privacy-ADR-gated)                            | Planned |

Dates belong on milestones and issues, where they can be revised without turning
this strategy document into a second project board.

The groups epoch (v2.0) shipped; the boundary that organizes releases now is social:
the app is the league's **memory, scoreboard, and referee** — it feeds the group chat
instead of competing with it (#383). The pre-season releases assemble the weekly
ritual (pick → reveal → sweat → recap → share) before NFL kickoff; the season-end
release turns Wrapped into the invite loop. The August preseason slate (non-scoring
rounds) is the live testbed for the game-day features.

## Now

### v2.9 — The reveal ritual

Settle reveal timing as a written decision (#383: a two-axis Sealed / Deadline / Open
model, Sealed stays the default, non-retroactive by construction) and ship the
synchronized kickoff reveal (#359) so every week has a shared appointment moment.
Deadline/Open remain future modes, not 2026 builds.

## Next

### v2.10 — The All-In moment + season readiness

Elevate the All-In into a public, scarce, on-the-record declaration with the
"Guarantee" badge (#360, ADR-gated). Alongside it, the pre-kickoff readiness patches:
the changelog repair (#391), the set-based RLS-enabled pgTAP guard (#392), raw Odds
payload persistence for dispute resolution (#382), and Sentry cron missed-run
monitors (#206). The 2026-07-02 audit's bigger fixes — staging-clone release gating
and the single-owner RLS collapse — already shipped in PR #379.

## Planned

### v2.11 — The Sunday live layer

Make game day a second-screen habit: live scores with per-pick cover status (#386),
the who's-picked nudge board (#388), and the iMessage share card that feeds the chat
(#389). Scale-readiness alerts and the kickoff load test (#155) land here, before
Week 1 traffic.

### v2.12 — The league history layer

Weekly hardware and the all-time records book with record-broken alerts (#387), plus
the persisted cross-season "who knows ball" rating (#361, ADR-gated). Display-only
lore — safe to land around kickoff.

### Season end — the acquisition loop

Shareable Season Wrapped (#348): the privacy ADR first (a public route is a
deliberate exception to the group-scoping boundary), then the public card and social
unfurl. This is the friends-of-friends invite loop, timed for January.

## Off the dated roadmap

These tracks are real work but are deliberately not tied to a version, so the release
line stays honest about what is committed.

- **Architecture (parallel offseason track).** #381 consolidates page-load reads
  behind `+server.ts` endpoints consumed by client-side queries — the snappier-PWA
  and future-mobile-client enabler. It lands route-by-route between releases rather
  than as its own release.
- **Scaling (measurement-gated).** Observability first to define "measured scale,"
  then response caching and deeper operational work — each triggered by a metric
  crossing a threshold, not by a date. The alerting and kickoff load-test slice is
  scheduled into v2.11 (#155); everything beyond it stays metric-triggered per
  [`docs/observability/scaling-signals.md`](docs/observability/scaling-signals.md).
- **Gameplay decisions and research.** Catch-up mechanics (#109), auto-pick (#181),
  auto-pilot picks (#182), best-N scoring (#180), and the line-lock variant (#184)
  stay in the decide-when-wanted backlog; none are 2026-launch work, and each is
  gated on writing and accepting its ADR before any build.
- **Growth switches (parked).** Open group creation (#156) waits until growth beyond
  invite-driven friends-of-friends is wanted; the Callsign rename (#231) becomes real
  only if store or ad distribution friction materializes.
- **AI voice (foundation shipped).** ADR-0008, the weekly recap, and Season Wrapped
  are live; the remaining wave is the badge-voice override (#283 Wave 3), pulled in
  when there is appetite.

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
