# Runbook — Local JWT verification & asymmetric signing keys (ADR-0031)

**Purpose:** operate the auth hot-path change from issue #588 / **ADR-0031** — the app
now verifies each request's access-token JWT **locally** via `supabase.auth.getClaims()`
instead of a per-request `getUser()` round-trip to GoTrue. This runbook covers the
per-environment signing-key rollout, the revocation trade-off that comes with it, how
key rotation is handled, and the post-deploy measurement.

**Read this when:** enabling/rotating Supabase JWT signing keys, changing the
access-token TTL, touching `resolveSafeSession` (`src/lib/server/auth-session.ts`) or
`safeGetSession` in `src/hooks.server.ts`, or investigating an auth latency/verification
issue.

## How verification works now

`hooks.server.ts` → `safeGetSession()` → `resolveSafeSession(supabase.auth)`:

1. `getSession()` — a local cookie decode (cheap, no network). No session → fail closed.
2. `getClaims(access_token)` — verifies the token's **signature + expiry**:
   - **Asymmetric signing key configured (ES256/RS256):** verified locally against the
     project's **cached JWKS**, with no network call on the happy path. This is the win.
   - **Still on the symmetric HS256 secret:** `getClaims()` cannot verify locally (the
     app has no shared secret), so it transparently falls back to a `getUser()` call.

Because of that fallback, **the code is correct and fail-closed whether or not
asymmetric keys are enabled yet** — enabling the keys is what flips an environment from
"getUser fallback" to "local verification". This is the HS256 fallback window the ADR
describes; there is no lockstep deploy required between code and key rollout.

Invariants preserved (see ADR-0031): signature + expiry are always verified on every
request; **RLS remains the real authorization** (Postgres independently re-validates the
JWT on every user-scoped query); admin mutations still re-verify `users.role` in
`requireAdmin`.

## Per-environment signing-key state

| Environment | Project                | Signing key  | JWKS endpoint                                                            |
| ----------- | ---------------------- | ------------ | ------------------------------------------------------------------------ |
| Local       | `supabase start` stack | **ES256** ✅ | `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`                   |
| QA/Staging  | staging project        | _enable_     | `https://<qa-ref>.supabase.co/auth/v1/.well-known/jwks.json`             |
| Production  | `anzcshrpfpxajcgrwczv` | _enable_     | `https://anzcshrpfpxajcgrwczv.supabase.co/auth/v1/.well-known/jwks.json` |

**Local** already provisions an asymmetric ES256 key by default (recent Supabase CLI) —
the JWKS endpoint above returns a `kty:"EC"`, `alg:"ES256"` key, and the
`tests/integration/localJwtVerification.test.ts` suite proves a real signed-in token
verifies locally with no `getUser` call. Nothing to do; just confirm the endpoint
responds after `supabase start`.

### Enabling asymmetric keys on a hosted project (QA, then prod)

This is a **project-level auth-config change in the Supabase dashboard**, not a database
migration — it does not touch the hash ledger. **Production
(`anzcshrpfpxajcgrwczv`) is a prod write: get Doug's explicit go-ahead first, and do QA
first as a dry run.**

1. Dashboard → **Authentication → Signing Keys** (a.k.a. JWT Keys).
2. **Create a new signing key** of type **ECC (P-256 / ES256)** — added as a _standby_
   key. The existing HS256 shared secret stays the current key for now.
3. **Rotate** to promote the new asymmetric key to **current**. The previous HS256
   secret moves to **previously used** and stays valid — so access tokens already issued
   under it keep verifying. During this window, requests split between local verification
   (new-key tokens) and the `getUser` fallback (old-key tokens).
4. Wait out the access-token TTL (below) so every in-flight HS256 token has expired and
   clients have refreshed onto asymmetric tokens.
5. Optionally **revoke** the old HS256 key once no tokens reference it. (Leaving it in
   "previously used" is harmless; revoking removes the last fallback path.)
6. Confirm the JWKS endpoint returns the new key and its `kid`, then run the post-deploy
   check below.

## Access-token TTL & the revocation trade-off

This is the accepted cost of local verification, from ADR-0031 "Consequences":

- With `getUser()`, server-side session revocation was reflected **immediately** (the
  auth server was consulted every request).
- With local verification, a token is trusted until its **`exp`**. Revoking a session
  server-side (admin sign-out, password change, deleting the refresh token) stops the
  session from **refreshing**, so the user loses access within **at most one
  access-token lifetime**, not instantly.

**Keep the access-token TTL bounded and short.** Supabase's default is **1 hour**
(`JWT expiry` under Authentication → Sessions / Settings). That 1 h is the maximum
revocation-latency window. Do **not** raise it materially without revisiting this
trade-off. Two backstops narrow the blast radius regardless:

- **RLS at the DB** re-validates the JWT (signature + expiry) on every user-scoped query,
  so an expired token buys nothing at the data layer.
- **Admin authorization** (`requireAdmin`) re-reads `users.role` fresh/uncached, so a
  demoted admin is denied on the next request, not at TTL expiry.

If an individual session must be killed faster than the TTL, that is an
`auth.admin.signOut(userId)` + password-invalidation operation — understand it takes
effect at token expiry for the app hook (immediately for refresh).

## Key rotation is handled without a redeploy

`getClaims()` caches the JWKS in-instance and **refetches on an unknown `kid`**. So
rotating to a new asymmetric key (step 3 above) is picked up automatically: the first
request carrying a token signed by the new key sees an unknown `kid`, triggers a JWKS
refetch, and verifies. No redeploy, and no lockout — an unresolvable `kid` fails **closed**
(`{ session: null, user: null }`), it is never silently accepted.

## Post-deploy verification (per environment after enabling keys)

- [ ] JWKS endpoint for the env returns an `alg: ES256` key (see table).
- [ ] **Sentry:** `GET /auth/v1/user` hot-path call count falls to **≈ 0** (from the
      ~175k/90d baseline in ADR-0031). Record the new number.
- [ ] **Sentry:** re-measure page-load **p95** and record it against the ADR baseline
      (`load picks` ~70 ms avg / 165 ms p95 was #2 behind `getUser`).
- [ ] Manual smoke: sign-in, sign-out, a session refresh (leave a tab idle past a token
      expiry and navigate), and an admin-gated action all behave unchanged.
- [ ] Tab-switch latency on the installed PWA feels snappier across all four tabs.

## Pass criteria

- [ ] Target env's JWKS is reachable and asymmetric (ES256).
- [ ] Authenticated navigation works with **no** `/auth/v1/user` call on the happy path.
- [ ] An invalid signature / expired token / unresolvable `kid` yields a null session
      (fail closed) — unchanged contract.
- [ ] Access-token TTL confirmed ≤ 1 h; revocation-latency trade-off understood.
- [ ] A key rotation is picked up with no redeploy and no live-session lockout.

## Notes / gotchas

- The **client** root layout (`src/routes/+layout.ts`) still calls `getUser()`. That runs
  in the browser on full page loads / auth-state changes, **not** on the server tab-switch
  hot path this change targets, and the client can never be a trust anchor for server-side
  RLS anyway. Intentionally left unchanged (out of scope for #588).
- Do not "cache" `getUser()` on a TTL as a shortcut — that weakens the trust anchor
  without a cryptographic guarantee and blurs the ADR-0014 boundary. ADR-0031 rejected it.
- Version floor: local verification of asymmetric tokens needs `supabase-js`
  `getClaims()` support (pinned `2.110.2` satisfies it).
