# ADR-0033: Client-query data loading — move page-load reads behind `+server.ts`

- Status: Accepted
- Date: 2026-07-13
- Issue: #602 (supersedes #381)
- Supersedes: None

## Context

Mobile is the priority and usage is phones-dominant. A future Capacitor wrap (or any
second client) needs to talk to a clean, client-agnostic HTTP API that is not entangled
with web page rendering. Today the app is half-there: ADR-0017 introduced
`@tanstack/svelte-query`, IndexedDB persistence, and a validated-param
`/api/{stats,group,leaderboard}` read path for **three** screens — but most read data
still flows through page-coupled `+page.server.ts` `load` functions that no non-web
client can consume and that re-run a full server round-trip on every navigation to them.

This is a change to a **cross-cutting application pattern** — the data-loading
architecture across most routes — which the trigger test in `docs/adr/README.md`
requires be recorded before implementation. It is deliberately a bounded migration, not
a framework rewrite: SvelteKit is retained and web stays first-class.

Related prior art:

- **ADR-0017** established the client-cache pattern (query keys, validated-param
  endpoints, SSR seed, bounded/build-busted persistence, targeted invalidation) for the
  Stats / Group / Leaderboard screens. This ADR generalizes that same pattern to the
  rest of the app rather than inventing a new one.
- **ADR-0031** removes the per-request `getUser()` auth tax from the request hot path.
  It is complementary: cache-first navigation still pays the auth hook on every
  _remaining_ server load and every `+server.ts` call, so the two together deliver
  navigation that is both round-trip-free (cached) _and_ auth-tax-free. Neither
  substitutes for the other.
- **ADR-0014** (short-TTL auth-context cache) and **ADR-0002 / ADR-0011** (membership as
  the RLS boundary, closed-by-default grants) are unchanged and remain the authorization
  model this ADR reaffirms.

## Decision

Adopt **load classification** as the durable data-loading pattern for the app, and
migrate route-by-route toward it. Every `+page.server.ts` / `+page.ts` `load` is
classified as exactly one of:

- **(a) Pure data read → client query.** Move the read to a TanStack Query
  (`createQuery`) that hits a new or existing `+server.ts` endpoint, following the
  ADR-0017 convention verbatim. Subsequent client navigations render cache-first with no
  full server round-trip; the endpoint is consumable by any client.
- **(b) Server-only concern → stays on the server.** Auth guards and redirects,
  admin-gated loads, cron endpoints, SSR that must not be client-exposed, and any
  sensitive/per-role data (commissioner/invite, per ADR-0017 boundary 3) remain in the
  server `load`. When in doubt, a load is server-only.

Boundaries future work must preserve:

1. **Endpoint/query convention is ADR-0017's, unchanged.** Each new `+server.ts` read
   handler does `const { user, memberships } = locals` (401 if no user), parses and
   validates `?groupId=&season=` (and any further params) against `locals.memberships`
   (403 if not a member) **before** calling the existing service-role, `group_id`-filtered
   query functions. Query keys stay per `(groupId, season, …)`. This is a validated-param
   read path, **not** a new trust boundary.

2. **Authorization does not move to the client.** RLS and membership validation remain
   the real authorization; the client cache is a latency optimization, never the security
   boundary. No read intended to be protected may be exposed through a newly
   client-consumed endpoint without the equivalent membership/`group_id` scoping the page
   load had. A migration that would widen who can read data is out of scope for #381.

3. **SSR seeds first paint; only later navigations go cache-first.** The
   initially-requested route still renders its data server-side (via the retained server
   load for a server-only route, or by seeding the query cache with dehydrate/hydrate /
   `initialData` for a migrated route) so there is no first-paint flash and no SSR/SEO
   regression. Cache-first behavior applies to _subsequent in-app_ navigations, matching
   ADR-0017.

4. **Persistence and invalidation stay bounded and targeted.** Newly cached read data
   obeys ADR-0017's build-id `buster` + bounded `maxAge`; sensitive/commissioner data is
   never persisted. Mutations use targeted `invalidateQueries`, not `invalidateAll`.

5. **Migrate route-by-route; each migration is independently mergeable.** The surface is
   large (most routes plus the shell and `src/lib/query/**`), so PRs are sequenced per
   route to stay reviewable, and shared query-layer files are serialized against
   concurrent route work. No DB, schema, or RLS change.

The migration begins with an **inventory** that classifies every app-route load as (a)
or (b) with rationale — the artifact required by #381's acceptance criteria and the
contract that keeps later per-route PRs honest.

## Consequences

- **Helpful:** cache-first, offline-capable navigation extends from three screens to the
  whole app; a clean client-agnostic API surface makes a later Capacitor/native wrap
  cheap rather than a rewrite; combined with ADR-0031, navigation to a migrated screen is
  both round-trip-free (when cached) and free of the auth-server tax.
- **Harmful / cost:** a large shared surface (many routes + the shell) with real drift
  risk — a migrated endpoint that skips the `memberships` check would silently widen
  access. Every moved read needs integration coverage (401 unauthenticated / 403
  non-member / member-sees-only-their-group) mirroring `groupIsolation.test.ts`, and the
  client-cache mental model (keys, staleness, persistence, invalidation) now applies
  app-wide. Careless classification could leak a server-only concern to the client;
  the explicit (b) list is the guard.
- **Operational:** no database, schema, or RLS change. Persisted IndexedDB data remains
  governed by ADR-0017's build-id buster + bounded `maxAge`; sensitive data stays
  structurally excluded from the cache.
- **Testing:** `pnpm test:unit` for query/endpoint logic; `pnpm test:integration` for
  each new/expanded endpoint against local Supabase; `pnpm test:e2e` for parity on the
  primary flows (picks lock/reveal, leaderboard, group, stats); manual checks that auth
  redirects and offline cache-first render still behave.

## Alternatives considered

- **Status quo — keep page-coupled `+page.server.ts` loads.** No new pattern to learn,
  but every read stays entangled with web page rendering, so a second client has no clean
  API and each later migration becomes bespoke. Rejected — it fails the mobile-enabler
  outcome #381 exists for.
- **Rewrite to React / React Native for a shared client.** Discards a working,
  web-first SvelteKit app for a much larger, riskier change. Rejected — disproportionate
  and explicitly out of #381's scope.
- **Migrate bearer-token / native auth now.** Only true native clients need it; a
  Capacitor webview wrap reuses the cookie session. Premature; deferred (excluded by
  #381).
- **One big-bang PR across all routes.** Unreviewable across the whole route surface and
  a merge-conflict magnet. Rejected in favor of route-by-route, each independently
  mergeable.
- **Rely on ADR-0031 (auth hot-path) alone.** Removes the per-request auth tax but leaves
  data page-coupled and offers no client-agnostic API. Complementary, not a substitute.

## Follow-up

- **#602** implements this route-by-route (superseding the original **#381**, closed
  NOT_PLANNED once the decision was split into this recorded ADR + a fresh ADR-governed
  implementation issue): first the classification inventory artifact, then per-route
  migrations, each with endpoint parity tests mirroring `groupIsolation.test.ts`.
- Sequence independently from **ADR-0031 / #588** (the auth hot-path change); together
  they deliver cache-first _and_ round-trip-free navigation.
- Post-migration measurement: navigation to a migrated screen should render from cache
  with no server round-trip; re-check page-load p95 in Sentry and confirm no protected
  read became reachable without membership scoping.
