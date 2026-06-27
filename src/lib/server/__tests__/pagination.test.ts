import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  clampLimit,
  decodeCursor,
  encodeCursor
} from '$lib/server/pagination';

describe('pagination cursors', () => {
  it('round-trips an ordering tuple through encode/decode', () => {
    const tuple = { tp: 42, w: 3, p: 1, u: '00000000-0000-0000-0000-000000000001' };
    const cursor = encodeCursor(tuple);
    expect(typeof cursor).toBe('string');
    expect(decodeCursor<typeof tuple>(cursor)).toEqual(tuple);
  });

  it('produces a URL-safe (base64url) cursor with no +, / or = padding', () => {
    // A payload whose base64 would normally contain + and / characters.
    const cursor = encodeCursor({ r: 'commissioner', j: '2026-06-27T00:00:00+00:00', u: '??>>' });
    expect(cursor).not.toMatch(/[+/=]/);
  });

  it('decodes a missing or empty cursor to null (first page)', () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('decodes a malformed cursor to null instead of throwing', () => {
    expect(decodeCursor('not-base64-$$$')).toBeNull();
    // valid base64url but not JSON
    expect(decodeCursor(Buffer.from('hello', 'utf8').toString('base64url'))).toBeNull();
    // valid JSON but not an object
    expect(decodeCursor(Buffer.from('123', 'utf8').toString('base64url'))).toBeNull();
  });
});

describe('clampLimit', () => {
  it('defaults a missing or non-finite limit to DEFAULT_PAGE_SIZE', () => {
    expect(clampLimit()).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(NaN)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(Infinity)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('clamps into [1, MAX_PAGE_SIZE]', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-10)).toBe(1);
    expect(clampLimit(MAX_PAGE_SIZE + 50)).toBe(MAX_PAGE_SIZE);
  });

  it('passes through an in-range limit, truncating fractions', () => {
    expect(clampLimit(10)).toBe(10);
    expect(clampLimit(25.9)).toBe(25);
  });
});
