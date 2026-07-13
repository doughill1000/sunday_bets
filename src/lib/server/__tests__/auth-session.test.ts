import { describe, it, expect, vi } from 'vitest';
import type { JwtPayload, Session } from '@supabase/supabase-js';
import { resolveSafeSession, userFromClaims } from '$lib/server/auth-session';

// A representative set of verified claims (the shape `getClaims()` returns for an
// authenticated Supabase session — see RequiredClaims + JwtPayload in @supabase/auth-js).
const CLAIMS: JwtPayload = {
  iss: 'https://local.test/auth/v1',
  sub: 'user-123',
  aud: 'authenticated',
  exp: 9_999_999_999,
  iat: 1_000,
  role: 'authenticated',
  aal: 'aal1',
  session_id: 'sess-1',
  email: 'player@example.com',
  app_metadata: { provider: 'email' },
  user_metadata: { display_name: 'Player One' }
};

// Only `access_token` is read by resolveSafeSession; the rest of the Session shape is
// irrelevant to verification, so cast a minimal object.
const SESSION = { access_token: 'header.payload.signature' } as unknown as Session;

/**
 * Build a stub of the Supabase auth client covering the three methods that matter:
 * `getSession` (local cookie decode), `getClaims` (local JWT verification), and
 * `getUser` (the auth-server round-trip we are eliminating — present only so tests can
 * assert it is never called on the hot path).
 */
function stubAuth(opts: {
  session?: Session | null;
  claims?: JwtPayload;
  claimsError?: { message: string } | null;
}) {
  const { session = SESSION, claims = CLAIMS, claimsError = null } = opts;
  return {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    getClaims: vi.fn(async () =>
      claimsError
        ? { data: null, error: claimsError }
        : { data: { claims, header: {}, signature: new Uint8Array() }, error: null }
    ),
    getUser: vi.fn(async () => ({ data: { user: null }, error: null }))
  };
}

describe('resolveSafeSession', () => {
  it('returns session + user from a locally verified token, with no getUser round-trip', async () => {
    const auth = stubAuth({});

    const { session, user } = await resolveSafeSession(auth as any);

    expect(session).toBe(SESSION);
    expect(user?.id).toBe('user-123');
    expect(user?.email).toBe('player@example.com');
    // Verification happens locally via getClaims against the session's access token…
    expect(auth.getClaims).toHaveBeenCalledTimes(1);
    expect(auth.getClaims).toHaveBeenCalledWith(SESSION.access_token);
    // …and NEVER hits the auth server (the whole point of ADR-0031).
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it('fails closed (no user, no verification) when there is no session', async () => {
    const auth = stubAuth({ session: null });

    const result = await resolveSafeSession(auth as any);

    expect(result).toEqual({ session: null, user: null });
    expect(auth.getClaims).not.toHaveBeenCalled();
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it('fails closed when getClaims rejects the token (bad signature / expired / unknown kid)', async () => {
    const auth = stubAuth({ claimsError: { message: 'Invalid JWT signature' } });

    const result = await resolveSafeSession(auth as any);

    // Same fail-closed contract the old getUser() error path had.
    expect(result).toEqual({ session: null, user: null });
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});

describe('userFromClaims', () => {
  it('maps sub → id and carries the identity claims through', () => {
    const user = userFromClaims(CLAIMS);
    expect(user.id).toBe('user-123');
    expect(user.role).toBe('authenticated');
    expect(user.email).toBe('player@example.com');
    expect(user.app_metadata).toEqual({ provider: 'email' });
    expect(user.user_metadata).toEqual({ display_name: 'Player One' });
  });

  it('collapses an array aud claim to its first entry', () => {
    const user = userFromClaims({ ...CLAIMS, aud: ['authenticated', 'other'] });
    expect(user.aud).toBe('authenticated');
  });

  it('defaults metadata to empty objects when the JWT omits them', () => {
    const { app_metadata, user_metadata, ...rest } = CLAIMS;
    // Reference the destructured claims so the omission is explicit to the reader.
    void app_metadata;
    void user_metadata;
    const user = userFromClaims(rest as JwtPayload);
    expect(user.app_metadata).toEqual({});
    expect(user.user_metadata).toEqual({});
  });
});
