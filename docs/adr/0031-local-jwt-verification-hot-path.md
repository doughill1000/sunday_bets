# ADR-0031: Local JWT verification on the request hot path

- Status: Accepted
- Date: 2026-07-13
- Issue: #588 (auth hot-path performance); related: #381
- Supersedes: None

## Context

PWA tab switches feel laggy. A tab switch is a client-side navigation, but in
SvelteKit the destination route's `+page.server.ts` runs on the server (a
`__data.json` fetch that passes through the `handle` hooks), and the client blocks on
its non-streamed data before rendering. So every tab switch pays the cost of the auth
hooks plus the destination load.

Sentry span data (90d; note: currently dominated by local/CI traffic, so read as
relative compute cost on loopback — production adds real network RTT on top) points at
one operation above all others:

| Operation                          | calls   | avg    | p95    |
| ---------------------------------- | ------- | ------ | ------ |
| `GET /auth/v1/user` (`getUser()`)  | 174,696 | ~72 ms | 138 ms |
| `load picks` (heaviest page load)  | 22,584  | ~70 ms | 165 ms |
| `auth-hook.users-profile` (cached) | 12,344  | ~30 ms | 64 ms  |
| individual PostgREST reads         | —       | 8–20ms | 20–45  |

`getUser()` is the single most-called operation in the app and, at ~72 ms even over
loopback, the largest controllable cost on the request path. It runs on **every**
request. `hooks.server.ts` `safeGetSession()` does `auth.getSession()` (a local cookie
decode, cheap) followed by `auth.getUser()` — a network call to the GoTrue
`/auth/v1/user` endpoint whose sole purpose is to **validate the access-token JWT**
before we trust it. It is memoized per request but never cached across requests (it is
the trust anchor), so it is a fixed tax on every navigation and every API call.

This is not network geography: the Vercel functions (`iad1`) and Supabase
(`us-east-1`) are colocated. It is an inherent extra round-trip to the auth server on
every request.

Prior art:

- **ADR-0014** caches the per-request auth-hook _profile/membership_ lookups
  (~30 s TTL) but deliberately does **not** cache JWT validation — that is `getUser`'s
  job as the trust anchor. This ADR replaces _how_ that validation happens, leaving
  ADR-0014 intact and orthogonal.
- **ADR-0017** made read screens cache-first on the client. That reduces how often a
  server load runs, but every remaining server load and every `+server.ts` endpoint
  still calls `getUser`, so the tax survives. Complementary, not a substitute.

Constraint to respect: the access-token JWT is the trust boundary for RLS. Postgres
independently validates that JWT on every query issued through the user-scoped client.
`locals.user` additionally drives the `isAdmin` UI hint (admin _mutations_ re-verify
`users.role` server-side in `requireAdmin`) and active-group resolution.

## Decision

Replace the per-request `getUser()` network validation with **local cryptographic
verification** of the access token:

1. Migrate each Supabase environment (prod, QA, local) to **asymmetric JWT signing
   keys** (ECC/RSA), which exposes a public JWKS.
2. In `safeGetSession()`, verify the access token locally via `supabase.auth.getClaims()`
   — with asymmetric keys configured, it verifies the signature and claims against the
   **cached JWKS** with no network call, falling back to a fetch only on a cache miss
   or key rotation (unknown `kid`). Treat the verified claims (`sub`, `role`, `exp`, …)
   as authoritative for `locals.session` / `locals.user` on the request path.

Boundaries future work must preserve:

- **Always verify signature + expiry locally on every request.** Never trust an
  unverified `getSession()` decode — closing exactly that gap is why `getUser` exists
  today.
- **RLS remains the real authorization.** Postgres re-validates the JWT itself on every
  user-scoped query. This change alters only how the _app hook_ establishes identity,
  not how the database authorizes.
- **Admin mutations keep re-verifying `users.role` server-side** (`requireAdmin`),
  unchanged.
- **JWKS caching must handle rotation** — refetch on an unknown `kid` so a key rotation
  never locks users out or (worse) forces silent acceptance.

## Consequences

Helpful:

- Removes ~72 ms (loopback) **plus production auth-server RTT** from every navigation
  and every API request — a uniform win across all four tabs and the single largest
  controllable latency reduction available without the broader #381 migration.
- Fewer calls to GoTrue: less coupling of request latency to Auth-service health.

Harmful / costs:

- **Trust-boundary change.** A compromised signing key or a verification bug could let
  a forged token through until detected. Mitigated by: local JWKS verification is the
  Supabase-recommended pattern, RLS still independently validates the JWT at the DB,
  and admin paths re-verify role.
- **Revocation latency.** `getUser` reflects server-side session revocation
  immediately; local verification trusts a token until its `exp`. Requires a **bounded,
  short access-token lifetime** (e.g. 1 h) so revoked/expired sessions clear promptly.
  This is an explicit accepted trade-off, to be documented in the auth runbook.
- **Operational rollout.** Enabling asymmetric keys is a per-project change coordinated
  across prod/QA/local, with an HS256 fallback window during rotation.
- **Version floor.** Requires `supabase-js` support for `getClaims()` asymmetric
  verification (pinned `2.110.2` satisfies this) and the `@supabase/ssr` client wiring.

## Alternatives considered

- **Keep `getUser()`.** Simplest; pays the per-request tax forever. Rejected — it is the
  measured top cost.
- **Cache the `getUser()` result on a short TTL (à la ADR-0014).** Weakens the trust
  anchor without a cryptographic guarantee, still makes a network call on miss, and
  blurs the boundary ADR-0014 deliberately drew. Rejected.
- **Trust the `getSession()` decode without verifying the signature.** Fast but
  insecure — accepts unsigned/forged tokens; this is precisely what `getUser` was added
  to prevent. Rejected.
- **Rely on #381 (client-query migration) alone.** Reduces how often loads run but every
  remaining server load and API endpoint still calls `getUser`. Complementary; does not
  remove the tax.

## Follow-up

- File the implementation issue (auth hot-path performance) and land this ADR with (or
  just before) that PR — a bounded decision, so a Proposed ADR may travel with the
  implementation.
- **Related: #381** — the load-classification migration (move blocking `+page.server.ts`
  reads to client TanStack Query against `+server.ts`). Together the two deliver
  cache-first _and_ round-trip-free navigation; sequence them independently.
- Post-change measurement: `GET /auth/v1/user` call count on the hot path should fall to
  ~0; re-check page-load p95 in Sentry.
- Confirm and document the production access-token TTL; add the revocation trade-off to
  the auth runbook.
