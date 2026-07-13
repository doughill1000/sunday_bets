// tests/integration/localJwtVerification.test.ts
//
// End-to-end proof of ADR-0031 / issue #588 against the running local Supabase:
// a REAL GoTrue-issued access token (signed with the local project's asymmetric
// ES256 key) verifies through `resolveSafeSession` WITHOUT an `/auth/v1/user`
// round-trip — the happy path the hot-path change relies on.
//
// Unlike the unit tests (which mock the auth client), this exercises the genuine
// getSession → getClaims local-JWKS verification against a token the local Auth
// server actually minted, and asserts the token is ES256-signed — so a regression
// that reverted local signing to the symmetric HS256 secret (which would silently
// re-introduce the getUser network fallback) fails here.

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/supabase';
import { ensureAuthUsers, deleteAuthUsers } from './fixtures/db';
import { resolveSafeSession } from '../../src/lib/server/auth-session';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

// A dedicated confirmed user (ensureAuthUsers seeds email_confirmed_at + the bcrypt
// hash of 'password'), isolated from the shared TEST_USERS so this suite owns its row.
const USER = {
  id: '00000000-0000-4000-8000-0000000005a8', // 0x5a8 = 1448 → "#588"-ish, distinct from other suites
  email: 'local-jwt-verify@example.com',
  displayName: 'Local JWT Verify'
};
const PASSWORD = 'password';

/** Fresh, session-persisting-free anon client (one per sign-in) so getSession reads
 *  the in-memory session from the sign-in below rather than any on-disk state. */
function anonClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `sb-jwt-verify-${process.pid}-${Math.random().toString(36).slice(2)}`
    }
  });
}

beforeAll(async () => {
  await ensureAuthUsers([USER]);
});

afterAll(async () => {
  await deleteAuthUsers([USER.id]);
});

describe('local JWT verification (ADR-0031)', () => {
  it('verifies a real ES256-signed session token via resolveSafeSession with no getUser call', async () => {
    const client = anonClient();

    const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
      email: USER.email,
      password: PASSWORD
    });
    expect(signInError).toBeNull();
    expect(signIn.session).not.toBeNull();

    // The local project must sign with the asymmetric key — otherwise getClaims would
    // fall back to a getUser() network call and the hot-path win would not apply.
    const header = jwt.decode(signIn.session!.access_token, { complete: true })?.header;
    expect(header?.alg).toBe('ES256');

    // Spy on the network trust-anchor so we can prove it is never consulted.
    let getUserCalls = 0;
    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = ((...args: Parameters<typeof originalGetUser>) => {
      getUserCalls += 1;
      return originalGetUser(...args);
    }) as typeof client.auth.getUser;

    const { session, user } = await resolveSafeSession(client.auth);

    expect(user?.id).toBe(USER.id);
    expect(user?.email).toBe(USER.email);
    expect(session?.access_token).toBe(signIn.session!.access_token);
    // The whole point of ADR-0031: local verification, no auth-server round-trip.
    expect(getUserCalls).toBe(0);
  });

  it('fails closed for an unauthenticated client (no session)', async () => {
    const client = anonClient(); // never signs in

    const result = await resolveSafeSession(client.auth);

    expect(result).toEqual({ session: null, user: null });
  });
});
