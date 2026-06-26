# ADR-0002: Group tenancy boundary and data model

- Status: Accepted
- Date: 2026-06-23
- Issue: None (pending v1.7 tenancy issues)
- Supersedes: None

## Context

Sunday Bets is today single-tenant: one implicit group of roughly six friends with no
group concept in the schema. The roadmap restructures the next two releases so that
social play and configurable gameplay rules ship together as the v1.8 season launch,
with self-service multi-group following at v2.0.

The product's defining boundary is single-group → multi-group, not the version number.
If v1.8's social and gameplay-rule features are built on single-tenant assumptions,
introducing groups later forces a `group_id` retrofit across picks, settlements,
leaderboards, RLS policies, and gameplay configuration — the largest, riskiest schema
migration, run on the most data, at exactly the moment scaling pressure is highest. A
decision is needed before v1.8 feature work begins on whether and when to introduce
the tenancy data model.

## Decision

Pay the tenancy tax early as an invisible down-payment in v1.7, before the v1.8
features, so those features are born group-aware and require no retrofit.

**Schema boundaries:**

- Introduce `groups` and `group_memberships` tables. Membership roles are
  `commissioner` and `member`.
- Add `group_id` to group-owned records and their unique keys. The `picks` primary
  key changes from `(user_id, game_id)` to `(group_id, user_id, game_id)`.
  `pick_settlement` and all leaderboard/stats views follow the same expansion.
- Keep canonical NFL data global and shared — games, teams, seasons, weeks,
  game_lines, scores, and the cron ingestion and grading pipeline. These are never
  multiplied per group.

**Authorization boundary:**

- Membership is the RLS boundary. Cross-group reads and writes are denied by policy
  and proven with pgTAP tests. Admin authority remains `users.role = 'admin'`.

**Configuration split:**

- Gameplay configuration (scoring rules, line preset, special-week settings) becomes
  group-owned. Operational settings (odds-quota caps, penalties) stay global on the
  existing single-row settings table.
- Per-week rule overrides ("special weeks") are keyed by `(group_id, week_id)`. They
  are never added as columns on the global `weeks` row.

**Backfill and visibility:**

- Every existing user and all historical picks, settlements, and standings move into
  the original "Sunday Bets" group. Current admins become commissioners. Season and
  weekly standings must be byte-identical before and after the backfill.
- v1.7 is invisible to players: the app auto-selects the sole membership and keeps
  group switching behind a feature flag until v2.0.
- Social tables (comments, reactions) carry `group_id` from creation in v1.8.

**Query discipline:**

- Group-owned queries lead with a `group_id`-prefixed index. RLS is not a
  query-performance strategy — this is an existing roadmap guardrail, reinforced here.

## Consequences

Paying the tenancy tax in v1.7 means v1.8 social and gameplay features are
group-aware from birth. v2.0 becomes UI and access work — invite flows, join/switch
screens, commissioner config editing — not a schema migration. The expensive "add
`group_id` everywhere and rewrite RLS" change happens once, early, against the
smallest schema and the least data. It also closes two single-tenant traps the prior
plan had baked in: gameplay config living on the global single-row settings table, and
special-week settings as columns on the global `weeks` row.

The cost is real. v1.7 delivers no user-visible feature — it is a deliberate
down-payment. It rewrites the `picks` primary key and the entire RLS policy surface. A
faulty backfill could corrupt historical standings; this is mitigated by a before/after
standings parity check and pgTAP coverage. Every group-owned query must carry a
`group_id` filter and a leading index; omitting either is a correctness or performance
bug, not a minor oversight. The operational-versus-gameplay configuration split
introduces a second config object and a resolution path that callers must understand.

## Alternatives considered

- **Retrofit at v2.0** (build v1.8 single-tenant, add `group_id` later): defers the
  cost but forces the biggest, riskiest migration on the largest dataset at the worst
  moment, and touches every affected feature twice. Rejected.
- **Stay single-group permanently**: simplest, but forecloses the roadmap's stated
  v2.0 groups epoch. Rejected.
- **Build full self-service multi-group now** (model + invite/switch UI): maximum
  scope, delays the season launch, and builds group-management UX before the model is
  proven against a real group. Rejected in favor of proving the model invisibly against
  the original group first.

## Follow-up

- v1.7 implementation issues to create: schema and migration via the hash-ledger flow;
  RLS policies with pgTAP cross-group denial tests; backfill with a standings parity
  check; group-aware queries and `group_id`-leading indexes; feature-flagged
  auto-select of the sole membership.
- Fairness-sensitive gameplay decisions are out of scope here and each require their
  own ADR before implementation: the line-and-lock grading preset, and catch-up
  mechanics.
- Revisit this decision if measured scale shows the global-NFL-data / per-group-config
  split needs to change.
