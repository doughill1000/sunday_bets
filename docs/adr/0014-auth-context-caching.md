# ADR-0014: Auth-context caching — short-TTL per-instance cache of the auth-hook lookups

- Status: Proposed
- Date: 2026-06-27
- Issue: #192
- Supersedes: None

## Context

Every authenticated request runs two uncached service-role queries in `injectSession`
(`src/hooks.server.ts`) before any page-specific work: a `users` lookup (`role`,
`display_name`, `avatar_key`, `guide_seen_at`) and a `group_memberships` lookup
(`group_id`, `status`, `role`, group name). This is pure per-request overhead that
multiplies under the Sunday-kickoff thundering herd — one of the Tier A scaling costs
from this session's architecture review.

The obvious fix — cache role + membership across requests — is attractive but
**caching authorization state changes the trust boundary's behavior**: a demoted admin,
a removed/suspended member, or a group-status change would not take effect until the
cache expires. Because this touches authz, the trigger test in `docs/adr/README.md`
("changes authentication, authorization, RLS, or another trust boundary") requires a
decision before implementation.

The before/after cost is already observable: #190 wired named Sentry spans
`auth-hook.users-profile` / `auth-hook.group-memberships` under a parent `auth-hook.db`
span (`src/lib/server/observability.ts`, `docs/observability/scaling-signals.md`). A
cache hit simply skips those child DB spans, so the win is measurable with no new
instrumentation. The two sibling Tier A scaling issues are already on master: ADR-0013
(#191, materialized leaderboard/stats views) and #190 (scaling observability).

## Decision

Cache the two auth-hook lookups in a **module-level, per-instance** `Map` keyed by
`user.id`, holding the raw results of both queries with a **~30s TTL**
(`AUTH_CONTEXT_TTL_MS`). The cache is a **latency optimization, never the security
boundary**.

Boundaries future work must preserve:

1. **RLS + the `group_id` filter remain the real data boundary.** A stale membership
   cache can never return another group's data: every data read is still RLS-gated (or,
   on the service-role read paths, filtered by `group_id`). This reaffirms ADR-0002
   (membership = the RLS boundary) and ADR-0011 (closed-by-default grant/RLS baseline).
2. **Privileged/admin operations must verify role uncached.** The cached `isAdmin` on
   `locals` is a **UI hint only**. The 8 admin API endpoints gate on `requireAdmin`
   (`src/lib/server/auth.ts`), and those handlers use the **service-role client, which
   bypasses RLS** — so `isAdmin` is the _only_ gate for grade/settings/sync, with no RLS
   backstop. `requireAdmin` must therefore re-read `users.role` fresh (uncached) rather
   than trust `locals.isAdmin`. This is what makes caching `isAdmin` safe; it is cheap
   because those endpoints are low-frequency.
3. **Session validation stays per-request — never cached.** `safeGetSession` /
   `getUser()` (`src/hooks.server.ts`) validate the JWT on every request; that is the
   actual session boundary and is out of scope for this cache.
4. **`groupId` is derived per-request** from the `active_group_id` cookie via
   `resolveActiveGroupId` (`src/lib/server/group-resolver.ts`) against the (cached)
   memberships. The cookie, not the cache, drives the active group, so group-switching
   stays instant.

**Staleness budget:** ~30s for a membership change, profile/avatar edit, or
`guide_seen_at` dismissal to propagate to the app shell; admin is always fresh (boundary
2). Because every underlying data operation is RLS-denied throughout the window, the only
thing that can go stale is **app-shell access/UI state**, not data exposure.

## Consequences

- **Helpful:** removes most of the per-request auth-hook DB cost, which is exactly the
  warm-instance kickoff burst this targets. The win is directly observable — the
  `auth-hook.users-profile` / `auth-hook.group-memberships` spans (#190) vanish on a
  cache hit, so the hit rate reads straight off Sentry.
- **Harmful / cost:** a bounded staleness window (≤ TTL) on the shared, sensitive auth
  path:
  - A just-removed/just-suspended member keeps **app-shell** access for ≤30s (the
    no-membership redirect guard and `groups/switch` validation read cached memberships).
    Their data is still RLS-denied — pgTAP `015_cross_group_stats_isolation` covers the
    layer.
  - A dismissed how-to-play guide (`guide_seen_at` rides the cached `users` row) could
    briefly re-show for ≤30s.
  - **Admin caching has no RLS backstop** (boundary 2), and `users.role` has **no in-app
    mutation path** (demotion is manual SQL), so role-change invalidation cannot be wired.
    Admin safety must therefore rest entirely on the `requireAdmin` fresh re-check, not on
    the TTL. The deny-after-revocation guarantee #192 demands holds at that re-check, not
    at cache expiry.
- **Operational:** per-instance only. On adapter-vercel's default Node serverless runtime
  (no `runtime: 'edge'`, no `export const config` anywhere) module-level state survives
  across requests within a warm instance — like the `supabaseService` singleton — but is
  not shared across instances, so it degrades gracefully to a cache miss. Memory growth is
  bounded by lazy TTL expiry plus a size cap.
- **Testing:** the cache adds surface to the auth path that needs unit coverage (TTL,
  hit/miss, eviction, invalidate) and an integration deny-after-revocation check (a
  demoted admin must be rejected by `requireAdmin` even with `isAdmin` cached stale-true).

## Alternatives considered

- **Status quo — two uncached queries every request (#192 option 1).** Always fresh, zero
  staleness, app-layer and RLS always agree, but it keeps the per-request overhead this
  decision exists to remove.
- **Cache with explicit invalidation on every role/membership change (#192 option 3).**
  Near-fresh reads, but invalidation paths are easy to miss → silent staleness, and
  `users.role` has no in-app write to hook anyway. Deferred to a defense-in-depth
  bust-on-write (`invalidate(userId)` from the cheap local profile/guide/membership
  mutations) layered on top of the TTL if the ~30s budget proves too lax.
- **Move role + membership into the session JWT claims (#192 option 4).** Zero extra DB
  reads, but the largest auth change: staleness tied to token lifetime, couples authz to
  token issuance, risks app-layer/RLS divergence, and is the hardest to reverse. Deferred
  unless measured need justifies it.

## Follow-up

- #192 produces a **follow-up implementation issue** (#263) carrying the design: new
  `src/lib/server/auth-context-cache.ts` (modeled on the lazy module-singleton in
  `src/lib/supabase/service.ts`), wiring the existing traced `Promise.all` in
  `injectSession` as the cache fetcher (so a miss still emits the #190 DB spans and a hit
  emits none), and the `requireAdmin` fresh re-check.
- **Measurement:** confirm in Sentry that the `auth-hook.*` spans drop out on cache hits;
  report the before/after on the auth path in the implementation PR.
- If the ~30s budget proves too lax, add #192 option-3 bust-on-write invalidation. If
  per-request DB reads must be eliminated entirely (not just reduced), revisit option 4.
