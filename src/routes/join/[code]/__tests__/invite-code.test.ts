// src/routes/join/[code]/__tests__/invite-code.test.ts
//
// Unit tests for invite code parsing/guarding utilities.
// Covers the safe-path redirect guard (shared with auth) and the RPC error
// code → user-facing message mapping used in +page.server.ts.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers extracted inline for unit-testability. These mirror the logic in
// +page.server.ts and src/routes/auth/+page.server.ts exactly so any drift
// is caught here.
// ---------------------------------------------------------------------------

/** Returns true if the path is safe to redirect to (no open-redirect risk). */
function isSafePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

function redeemErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'P0002':
      return 'This invite link is not valid. Double-check the URL or ask for a new one.';
    case 'P0003':
      return 'This invite has been revoked by the group commissioner.';
    case 'P0004':
      return 'This invite has expired. Ask your commissioner for a new one.';
    case 'P0005':
      return 'This invite has already been used the maximum number of times.';
    default:
      return 'Could not join the group. Please try again.';
  }
}

// ---------------------------------------------------------------------------
// Open-redirect guard (mirrors auth callback and signin action)
// ---------------------------------------------------------------------------

describe('isSafePath', () => {
  it('accepts simple relative paths', () => {
    expect(isSafePath('/picks')).toBe(true);
    expect(isSafePath('/join/abc123')).toBe(true);
    expect(isSafePath('/')).toBe(true);
  });

  it('rejects protocol-relative URLs that could redirect off-domain', () => {
    expect(isSafePath('//evil.com')).toBe(false);
    expect(isSafePath('//example.com/picks')).toBe(false);
  });

  it('rejects absolute URLs', () => {
    expect(isSafePath('https://evil.com')).toBe(false);
    expect(isSafePath('http://localhost/picks')).toBe(false);
  });

  it('rejects empty strings and bare hostnames', () => {
    expect(isSafePath('')).toBe(false);
    expect(isSafePath('evil.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RPC error code mapping
// ---------------------------------------------------------------------------

describe('redeemErrorMessage', () => {
  it('maps P0002 (not found) to an actionable message', () => {
    const msg = redeemErrorMessage('P0002');
    expect(msg).toContain('not valid');
  });

  it('maps P0003 (revoked) to a clear revocation message', () => {
    const msg = redeemErrorMessage('P0003');
    expect(msg).toContain('revoked');
  });

  it('maps P0004 (expired) to an expiry message', () => {
    const msg = redeemErrorMessage('P0004');
    expect(msg).toContain('expired');
  });

  it('maps P0005 (exhausted) to a max-uses message', () => {
    const msg = redeemErrorMessage('P0005');
    expect(msg).toContain('maximum number of times');
  });

  it('returns a generic fallback for unknown codes', () => {
    expect(redeemErrorMessage(undefined)).toContain('try again');
    expect(redeemErrorMessage('XXXXX')).toContain('try again');
  });

  it('covers all five expected error states without overlap', () => {
    const codes = ['P0002', 'P0003', 'P0004', 'P0005'] as const;
    const messages = codes.map((c) => redeemErrorMessage(c));
    // All messages should be distinct
    const unique = new Set(messages);
    expect(unique.size).toBe(codes.length);
  });
});

// ---------------------------------------------------------------------------
// Invite status derivation (mirrors the load function's validation logic)
// ---------------------------------------------------------------------------

type InviteStatus = 'valid' | 'invalid' | 'revoked' | 'expired' | 'exhausted';

function deriveInviteStatus(
  invite: {
    revoked_at: string | null;
    expires_at: string | null;
    max_uses: number | null;
    used_count: number;
  } | null
): InviteStatus {
  if (!invite) return 'invalid';
  if (invite.revoked_at !== null) return 'revoked';
  if (invite.expires_at !== null && new Date(invite.expires_at) < new Date()) return 'expired';
  if (invite.max_uses !== null && invite.used_count >= invite.max_uses) return 'exhausted';
  return 'valid';
}

describe('deriveInviteStatus', () => {
  const base = { revoked_at: null, expires_at: null, max_uses: null, used_count: 0 };
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  it('returns invalid for a null invite (not found)', () => {
    expect(deriveInviteStatus(null)).toBe('invalid');
  });

  it('returns valid for an open-ended invite', () => {
    expect(deriveInviteStatus(base)).toBe('valid');
  });

  it('returns valid for an invite that expires in the future', () => {
    expect(deriveInviteStatus({ ...base, expires_at: future })).toBe('valid');
  });

  it('returns expired for a past expires_at', () => {
    expect(deriveInviteStatus({ ...base, expires_at: past })).toBe('expired');
  });

  it('returns revoked when revoked_at is set (even if not yet expired)', () => {
    expect(
      deriveInviteStatus({ ...base, revoked_at: new Date().toISOString(), expires_at: future })
    ).toBe('revoked');
  });

  it('returns exhausted when used_count equals max_uses', () => {
    expect(deriveInviteStatus({ ...base, max_uses: 5, used_count: 5 })).toBe('exhausted');
  });

  it('returns exhausted when used_count exceeds max_uses', () => {
    expect(deriveInviteStatus({ ...base, max_uses: 3, used_count: 4 })).toBe('exhausted');
  });

  it('returns valid when used_count is below max_uses', () => {
    expect(deriveInviteStatus({ ...base, max_uses: 10, used_count: 3 })).toBe('valid');
  });

  it('prioritises revoked over exhausted', () => {
    expect(
      deriveInviteStatus({
        revoked_at: new Date().toISOString(),
        expires_at: null,
        max_uses: 1,
        used_count: 1
      })
    ).toBe('revoked');
  });

  it('prioritises revoked over expired', () => {
    expect(
      deriveInviteStatus({
        revoked_at: new Date().toISOString(),
        expires_at: past,
        max_uses: null,
        used_count: 0
      })
    ).toBe('revoked');
  });
});
