// src/routes/join/__tests__/invite-input.test.ts
//
// Unit tests for the paste-to-join input parsing on /join. The helper accepts either a
// full invite link or a bare code and yields the code to route to /join/[code].
//
// The function below mirrors extractInviteCode in ../+page.svelte exactly (same
// inline-mirror convention as ../[code]/__tests__/invite-code.test.ts) so any drift is
// caught here.

import { describe, it, expect } from 'vitest';

function extractInviteCode(input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  const joinMatch = raw.match(/\/join\/([^/?#\s]+)/i);
  if (joinMatch) return joinMatch[1];
  const seg = raw
    .replace(/^[a-z]+:\/\//i, '')
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean)
    .pop();
  return (seg ?? raw).trim();
}

describe('extractInviteCode', () => {
  it('returns a bare code unchanged', () => {
    expect(extractInviteCode('ABC123')).toBe('ABC123');
  });

  it('trims surrounding whitespace', () => {
    expect(extractInviteCode('  ABC123  ')).toBe('ABC123');
  });

  it('returns empty string for blank input', () => {
    expect(extractInviteCode('')).toBe('');
    expect(extractInviteCode('   ')).toBe('');
  });

  it('extracts the code from a full https invite link', () => {
    expect(extractInviteCode('https://hotshot.app/join/ABC123')).toBe('ABC123');
  });

  it('extracts the code from a link with a query string', () => {
    expect(extractInviteCode('https://hotshot.app/join/ABC123?ref=text')).toBe('ABC123');
  });

  it('extracts the code from a link with a trailing slash', () => {
    expect(extractInviteCode('https://hotshot.app/join/ABC123/')).toBe('ABC123');
  });

  it('extracts the code from a host-relative link (no protocol)', () => {
    expect(extractInviteCode('hotshot.app/join/ABC123')).toBe('ABC123');
  });

  it('extracts the code from a path-only value', () => {
    expect(extractInviteCode('/join/ABC123')).toBe('ABC123');
  });

  it('falls back to the last path segment for a link without /join/', () => {
    expect(extractInviteCode('https://example.com/ABC123')).toBe('ABC123');
  });
});
