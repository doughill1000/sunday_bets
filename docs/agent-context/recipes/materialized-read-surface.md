# Recipe: a materialized read surface

An ordered checklist for building a **read-only surface backed by aggregated /
materialized data** — a new page (or API) that shows league-wide or group-wide
numbers computed from a matview refreshed on the grading run. Each step links to the
pack or ADR that owns the rule; this file is the _sequence_, not a restatement.

## When to use

- A new descriptive surface over aggregated data — e.g. `/stats`, `/leaderboard`,
  `/league`. Read-only, no user-authored writes.
- The numbers are expensive to compute per request, so they are **materialized** and
  refreshed on grading (see [ADR-0013](../../adr/0013-materialized-leaderboard-stats.md)),
  not computed live.

If the surface writes data or introduces a new tenancy boundary, it needs its own
ADR — this recipe assumes neither.

## The slice (in order)

1. **Base matview** in `supabase/src/views/`. One matview at the atomic grain, the
   single source every aggregate reads from (so two callers can't compute the same
   number two ways). Give it a **unique index** (required for
   `REFRESH … CONCURRENTLY`), then `revoke all … from public, anon, authenticated`
   and `grant select … to service_role` — matviews can't carry RLS, so reads are
   service-role only. Example: `league_ats_base`. → [database.md](../database.md),
   [ADR-0013](../../adr/0013-materialized-leaderboard-stats.md).
2. **Aggregate plain views** over the base (don't re-aggregate in each caller). Mirror
   the `league_completed_standings`-over-matview pattern, including its CASCADE-bundling
   note: re-emitting the base drops dependent views, so every migration that re-emits
   the base must also re-touch each dependent file. Example: `league_ats_team` /
   `league_ats_fav_dog` / `league_ats_home_away`.
   - **Heed the emit order.** Objects emit alphabetically within `views/`, so a
     dependent view must sort **after** the base (name the base to sort first), and a
     view must not call a function your same change introduces. See the "Generator emit
     order" section in [database.md](../database.md).
3. **Wire the refresh.** Add `refresh materialized view concurrently public.<matview>;`
   to `supabase/src/functions/stats/refresh_leaderboard_stats.sql` so it repopulates at
   the end of each grading run. → [ADR-0013](../../adr/0013-materialized-leaderboard-stats.md).
4. **Generate + apply.** `pnpm db:migration --name=…` → `pnpm db:migration:check` →
   `pnpm db:push:local` → (types regen is part of `db:push:local`). Follow the
   [db-migration skill](../../../.claude/skills/db-migration/SKILL.md). **In a
   worktree**, remember `db:reset:local` can't prod-clone (see that skill's step 4);
   verify with `db:push:local` + a pgTAP fixture.
5. **pgTAP fixture** in `supabase/tests/`: assert structure (columns, unique index),
   grants (service_role allowed; anon/authenticated denied), and **hand-checked math**
   on a fixture season you own. Cover the exclusion rules and any line/precedence logic.
   Example: `042_league_ats.sql`. → [testing.md](../testing.md).
6. **Server read layer:**
   - Query in `src/lib/server/db/queries/` — reads the views via the service client.
   - Read model in `src/lib/server/readModels/` — assembles the client payload.
   - Client-safe types in `src/lib/types/server/`.
7. **Client cache** in `src/lib/query/{types,fetchers,keys}.ts`: add the payload type,
   a fetcher, and a query key. Add the key's root to `SHAREABLE_QUERY_ROOTS` only if the
   surface is shareable. → [ADR-0017](../../adr/0017-client-data-cache.md).
8. **API route** `src/routes/(app)/api/<name>/+server.ts`. Choose the auth fork:
   - **Group-scoped** (most surfaces): `guardGroupScopedRead(locals, url)` from
     `src/lib/server/api/groupScopedRead.ts`; the query key includes the group id.
   - **Group-independent** (league-style, identical for every user): auth-only, no
     group id — key is just `['<name>', season]`. Example: `/api/league`.
9. **Route trio** under `src/routes/(app)/<name>/`:
   - `+page.server.ts` — light load (season metadata / selectable options only).
   - `+page.ts` — SSR prefetch into `initialData` for the query.
   - `+page.svelte` — `createQuery` keyed by the query key; render modules + a
     sample-size caveat where samples can be thin.
10. **Nav (if adding a tab) — three places, or the e2e suite fails:**
    - `src/lib/components/app-header/AppHeader.svelte` (desktop)
    - `src/lib/components/app-header/BottomTabBar.svelte` (mobile)
    - `tests/e2e/nav.spec.ts` — its `TABS` array **and** the "N tabs" wording.
11. **Tests:** a Vitest unit test for any pure helper (e.g. a cover-percentage fn);
    an integration test that seeds a fixture, calls `refresh_leaderboard_stats()`, then
    asserts the query layer. Models: `tests/integration/leagueAts.test.ts` (this recipe's
    reference) and `tests/integration/nonScoringWeek.test.ts`. → [testing.md](../testing.md).

## Reference implementations

- **`/league` (group-independent)** — #406 / PR #420. The league ATS tab: base matview
  `league_ats_base` + three aggregate views, `/api/league` auth-only, 5th nav tab. The
  end-to-end example this recipe is drawn from.
- **`/stats` (group-scoped)** — the group-scoped counterpart, using
  `guardGroupScopedRead` and a group-keyed query.
