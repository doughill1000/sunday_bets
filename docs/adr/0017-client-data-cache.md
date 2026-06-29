# ADR-0017: Client-side stale-while-revalidate cache (TanStack Query) for read screens

- Status: Accepted
- Date: 2026-06-29
- Issue: #330
- Supersedes: None

## Context

Nothing is cached client-side today. The only store (`src/lib/stores/picks.ts`) holds
picks **form** state, and the `vite-plugin-pwa` `generateSW` service worker caches the
app shell but **not** data. So every revisit to Stats / Group / Leaderboard — including
in-session tab switching and a cold PWA relaunch — re-runs the full server `load` and its
queries.

This is **Phase 3** of the approved three-issue navigation-performance plan: Phase 1
(#328, skeletons + progress bar + active-tab) shipped; Phase 2 (#329) cuts per-navigation
server latency; this phase (#330) makes in-session tab switching render instantly from a
client cache and revalidate in the background, and makes a cold PWA launch render
last-known data immediately from IndexedDB.

Because it introduces a new framework dependency **and** a cross-cutting client
data-access pattern **and** a new validated-param read path that touches the membership
trust boundary, the trigger test in `docs/adr/README.md` requires a decision before
implementation. The materialized-view work (ADR-0013) already removed the server-side
aggregation cost; this ADR addresses the _round-trip and re-render_ cost that remains on
every navigation.

## Decision

Adopt **`@tanstack/svelte-query` (v5)** as the cross-cutting client data-access and
caching layer for the three read screens (Stats, Group, Leaderboard). A single
`QueryClient` is created in `src/routes/+layout.svelte`, provided via
`setQueryClientContext`, and tuned with a short `staleTime` (~30–60s) so a revisit renders
cached data instantly and revalidates in the background. Each route's `+page.server.ts`
`load` still returns the data for the **initially-requested** route and seeds it into the
client (dehydrate/hydrate or `initialData`) so there is no first-paint flash.

Boundaries future work must preserve:

1. **The new `/api/{stats,group,leaderboard}` read routes are an explicit, validated-param
   path — not a new trust boundary.** Each handler reads `const { user, memberships } =
locals;` (401 if no user), parses `?groupId=&season=`, and validates `groupId` against
   `locals.memberships` (403 if not a member) **before** calling the existing query
   functions — mirroring `/api/groups/switch/+server.ts`. Those query functions remain the
   same service-role reads, still filtered by `group_id`. This reaffirms ADR-0002
   (membership = the RLS boundary) and ADR-0011 (closed-by-default grants), and adds a
   validated-param read path alongside the cookie-derived `groupId` that ADR-0014 uses for
   page loads. Cookie-derived `groupId` was rejected for these routes because a cookie-only
   endpoint can only ever return the _active_ group, defeating per-group caching.

2. **Cache keys are per `(groupId, season)` so switching groups stays correct and
   instant.** Query keys are `['stats', groupId, season]`, `['group', groupId, season]`,
   and `['leaderboard', groupId, season, view, week, cursor]`. Each `(groupId, season)`
   caches independently; a previously-visited group renders from cache on switch. The
   cache is a **latency optimization, never the security boundary** — every read is still
   membership-validated server-side and `group_id`-filtered.

3. **Only shareable data is cached or persisted — never commissioner/invite data.** The
   Group page's `members / honors / badges / availableSeasons` flow through the cached
   query; the commissioner-only block (`isCommissioner`, `invites[]`, `gradingPreset`,
   `dropWorstWeek`, `presetLocked`) continues to come from `+page.server.ts` `PageData` and
   is **never** written to the cache or to IndexedDB. Live invite codes are sensitive,
   per-role, and low-frequency, so they stay on the server-load path.

4. **Persistence is bounded and deploy-busted.** Persist the QueryClient to **IndexedDB**
   (`@tanstack/query-persist-client` + an IndexedDB persister) for cold-PWA-launch instant
   render, with a `buster` tied to the build id (a deploy invalidates the persisted cache)
   and a bounded `maxAge`. Persistence init runs client-side only (guard SSR). Only the
   shareable stats/group/leaderboard query data is persisted.

5. **Mutations invalidate targeted keys, not everything.** Replace the post-mutation
   `invalidateAll()` calls on these screens with `queryClient.invalidateQueries` against
   the affected keys (group mutations → `['group', groupId]` plus `['leaderboard'|'stats',
groupId]` where standings/badges depend on it; grading → `['stats', groupId]` +
   `['leaderboard', groupId]`). Commissioner/invite mutations stay on the server-load path.
   Unrelated `invalidateAll` (e.g. `WelcomeGuide.svelte`, `settings`) is out of scope.

## Consequences

- **Helpful:** in-session tab switching and group switching render instantly from cache
  and revalidate in the background; a cold PWA relaunch renders last-known data from
  IndexedDB before revalidating; post-mutation refreshes become targeted instead of full
  reloads. SSR-prefetch + hydrate keeps first paint flash-free.
- **Harmful / cost:** a new client framework + a new client-cache mental model (query keys,
  `staleTime`/`gcTime`, persistence, invalidation) that every future read screen must
  follow consistently. A new set of `/api/*` read routes must keep membership/group-scoping
  parity with the page loads they mirror — a drift risk if a future route skips the
  `memberships` check. Bounded client staleness (≤ `staleTime`) on shareable data, which is
  acceptable because it is non-sensitive and revalidates on revisit.
- **Operational:** persisted IndexedDB data outlives a session; the build-id `buster` plus
  bounded `maxAge` keep it from serving cross-deploy or indefinitely stale data. Sensitive
  commissioner/invite data is structurally excluded from persistence (boundary 3).
- **Testing:** each new `/api/*` route needs integration coverage (401 unauthenticated, 403
  for a non-member `groupId`, member sees only their group's data) mirroring
  `groupIsolation.test.ts`, plus manual devtools verification of cache hits, background
  revalidation, group-switch cache reuse, correct mutation invalidation, cold-PWA render
  from IndexedDB, and deploy-bust.

## Alternatives considered

- **Status quo — re-run the server `load` on every navigation.** Always fresh, no new
  dependency, but it keeps the round-trip + re-render cost on every tab/group switch that
  this phase exists to remove. ADR-0013 already cut the _server_ aggregation cost; the
  client round-trip remains.
- **A hand-rolled Svelte store cache.** No new dependency, but we would reimplement
  staleness, background revalidation, per-key gc, persistence, and devtools — the exact
  surface TanStack Query already provides and tests. Higher long-run maintenance for the
  same behavior.
- **Cookie-derived `groupId` on the read routes (no explicit param).** Simpler handlers,
  but a cookie-only endpoint can only return the active group, so previously-visited groups
  could not be cached or rendered instantly on switch — it fails the core AC. Rejected
  (boundary 1).
- **Service-worker (Workbox) runtime data caching instead of TanStack Query.** Reuses the
  existing PWA SW, but it caches HTTP responses, not a typed query graph with
  staleness/invalidation/devtools, and would need its own invalidation keyed off mutations
  anyway. Could be layered later but does not give the in-app revalidation model this needs.

## Follow-up

- #330 implements this, sequenced **after #329 (Phase 2)** so the parallelized/deduped
  loads are converted to `createQuery` once rather than edited twice with conflicting
  diffs. `package.json` is a serialize-against-#329 shared file.
- Revisit `staleTime`/`gcTime`/`maxAge` and the persisted-cache size if measurement shows
  staleness complaints or storage pressure.
- If additional read screens are added, they should follow this query-key + validated-param
  pattern; if a screen needs sensitive data, keep it on the server-load path (boundary 3).
