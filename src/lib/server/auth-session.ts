// src/lib/server/auth-session.ts
//
// Local JWT verification for the request hot path (ADR-0031, issue #588).
//
// `hooks.server.ts` establishes `locals.session` / `locals.user` on EVERY server
// request — every SvelteKit `__data.json` navigation and every `+server.ts` call.
// Historically that meant a `getUser()` network round-trip to GoTrue on every request
// purely to validate the access-token JWT before we trust it — the single most-called
// and largest controllable cost on the request path (ADR-0031).
//
// `getClaims()` replaces that round-trip: with asymmetric signing keys configured on
// the Supabase project it verifies the token's signature + claims LOCALLY against a
// cached JWKS with no network call on the happy path, refetching the JWKS only on an
// unknown `kid` (a key rotation). For a still-symmetric (HS256) project it transparently
// falls back to a `getUser()` call — so this code is correct and fail-closed whether or
// not asymmetric keys are enabled yet (the rotation window). See the runbook:
// docs/runbooks/auth-jwt-verification.md.
//
// Invariants (ADR-0031):
//   - Signature + expiry are ALWAYS verified locally on every request. Never trust an
//     unverified `getSession()` decode — closing that gap is why `getUser` existed.
//   - RLS remains the real authorization: Postgres re-validates the JWT on every
//     user-scoped query. This only changes how the app hook establishes identity.
//   - Admin mutations keep re-verifying `users.role` server-side in `requireAdmin`.

import type { JwtPayload, Session, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * The narrow slice of the Supabase auth client `resolveSafeSession` needs. Pinning it
 * to `getSession` + `getClaims` (never `getUser`) makes the "no auth-server round-trip
 * on the hot path" contract structural — the hook can't accidentally validate over the
 * network — and lets unit tests supply a tiny stub instead of a full GoTrue client.
 */
type SessionAuth = Pick<SupabaseClient['auth'], 'getSession' | 'getClaims'>;

/**
 * Map signature-verified JWT claims to the `User` shape the app carries in
 * `locals.user`.
 *
 * The claims come from a token whose signature `getClaims()` has already verified, so
 * `sub` is a trustworthy user id. Request-path consumers read `user.id` (the
 * auth-context cache key, `requireAdmin`, active-group resolution); the remaining
 * fields are filled in where the JWT carries them. `created_at` is not a JWT claim, so
 * it is left empty — nothing on the request path reads it.
 */
export function userFromClaims(claims: JwtPayload): User {
  return {
    id: claims.sub,
    aud: Array.isArray(claims.aud) ? (claims.aud[0] ?? '') : claims.aud,
    role: claims.role,
    email: claims.email,
    phone: claims.phone,
    app_metadata: claims.app_metadata ?? {},
    user_metadata: claims.user_metadata ?? {},
    is_anonymous: claims.is_anonymous,
    created_at: '' // not carried in the JWT; unused on the request path
  };
}

/**
 * Establish the request's session/user from a LOCALLY VERIFIED access token.
 *
 * 1. `getSession()` — a cheap local cookie decode. No session → fail closed.
 * 2. `getClaims()` on that session's access token — verifies the signature + expiry
 *    (local against the cached JWKS with asymmetric keys; a `getUser()` fallback for a
 *    still-HS256 project). Any failure — bad signature, expired token, or an
 *    unresolvable `kid` — yields `{ session: null, user: null }`, the same fail-closed
 *    contract the old `getUser()` path had.
 */
export async function resolveSafeSession(
  auth: SessionAuth
): Promise<{ session: Session | null; user: User | null }> {
  const {
    data: { session }
  } = await auth.getSession();
  if (!session) {
    return { session: null, user: null };
  }

  // Pass the token explicitly so `getClaims` doesn't repeat the cookie decode we just
  // did in `getSession` above.
  const { data, error } = await auth.getClaims(session.access_token);
  if (error || !data) {
    // Signature / expiry / unknown-kid verification failed — fail closed.
    return { session: null, user: null };
  }

  return { session, user: userFromClaims(data.claims) };
}
