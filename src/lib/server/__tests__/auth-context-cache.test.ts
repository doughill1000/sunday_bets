import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAuthContextCache,
  getAuthContext,
  invalidateAuthContext,
  AUTH_CONTEXT_TTL_MS,
  AUTH_CONTEXT_MAX_ENTRIES
} from '$lib/server/auth-context-cache';

describe('createAuthContextCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the fetcher on a miss and serves the cached value on a hit', async () => {
    const cache = createAuthContextCache({ ttlMs: 1000 });
    const fetcher = vi.fn(async () => ({ profile: 'p', memberships: 'm' }));

    const first = await cache.get('user-1', fetcher);
    const second = await cache.get('user-1', fetcher);

    expect(first).toEqual({ profile: 'p', memberships: 'm' });
    expect(second).toBe(first); // same cached reference
    expect(fetcher).toHaveBeenCalledTimes(1); // hit did not re-run
  });

  it('keys the cache per user', async () => {
    const cache = createAuthContextCache({ ttlMs: 1000 });
    const fetcher = vi.fn(async (id: string) => id);

    await cache.get('user-1', () => fetcher('user-1'));
    await cache.get('user-2', () => fetcher('user-2'));
    await cache.get('user-1', () => fetcher('user-1'));

    expect(fetcher).toHaveBeenCalledTimes(2); // user-1 second call is a hit
    expect(cache.size()).toBe(2);
  });

  it('re-fetches after the TTL expires (lazy expiry)', async () => {
    const cache = createAuthContextCache({ ttlMs: 1000 });
    const fetcher = vi.fn(async () => Date.now());

    const first = await cache.get('user-1', fetcher);

    // Just before expiry: still a hit.
    vi.setSystemTime(999);
    expect(await cache.get('user-1', fetcher)).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // At/after expiry (now >= expiresAt): miss, fetcher runs again.
    vi.setSystemTime(1000);
    const second = await cache.get('user-1', fetcher);
    expect(second).toBe(1000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidate() drops the entry so the next get re-fetches', async () => {
    const cache = createAuthContextCache({ ttlMs: 10_000 });
    const fetcher = vi.fn(async () => 'value');

    await cache.get('user-1', fetcher);
    expect(cache.size()).toBe(1);

    cache.invalidate('user-1');
    expect(cache.size()).toBe(0);

    await cache.get('user-1', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2); // re-fetched after invalidate
  });

  it('invalidate() on an absent key is a no-op', () => {
    const cache = createAuthContextCache();
    expect(() => cache.invalidate('nope')).not.toThrow();
    expect(cache.size()).toBe(0);
  });

  it('caps size by evicting the oldest entry once over capacity', async () => {
    const cache = createAuthContextCache({ ttlMs: 10_000, maxEntries: 3 });
    const fetcher = async (id: string) => id;

    await cache.get('a', () => fetcher('a'));
    await cache.get('b', () => fetcher('b'));
    await cache.get('c', () => fetcher('c'));
    expect(cache.size()).toBe(3);

    // Fourth distinct user forces eviction of the oldest ('a') to stay at cap.
    await cache.get('d', () => fetcher('d'));
    expect(cache.size()).toBe(3);

    // 'b','c','d' survived — assert their hits FIRST (a hit never inserts, so it
    // triggers no further eviction). Each fetcher must go uncalled.
    for (const key of ['b', 'c', 'd']) {
      const hitFetcher = vi.fn(async () => key);
      await cache.get(key, hitFetcher);
      expect(hitFetcher).toHaveBeenCalledTimes(0);
    }

    // 'a' was evicted → its next get is a miss. (This re-insert evicts the new
    // oldest, but we assert nothing after it.)
    const aFetcher = vi.fn(async () => 'a');
    await cache.get('a', aFetcher);
    expect(aFetcher).toHaveBeenCalledTimes(1);
  });

  it('prefers evicting already-expired entries before the oldest live one', async () => {
    const cache = createAuthContextCache({ ttlMs: 1000, maxEntries: 2 });

    await cache.get('old-expired', async () => 'x'); // expiresAt = 1000
    vi.setSystemTime(500);
    await cache.get('young-live', async () => 'y'); // expiresAt = 1500

    // Advance past the first entry's TTL but not the second's.
    vi.setSystemTime(1200);

    // Inserting a third entry triggers capacity enforcement: the expired
    // 'old-expired' is reclaimed first, so the live 'young-live' survives.
    await cache.get('new', async () => 'z');
    expect(cache.size()).toBe(2);

    const youngFetcher = vi.fn(async () => 'y');
    await cache.get('young-live', youngFetcher);
    expect(youngFetcher).toHaveBeenCalledTimes(0); // still cached
  });

  it('refreshes write-recency on re-fetch so a renewed entry is not the eviction target', async () => {
    const cache = createAuthContextCache({ ttlMs: 1000, maxEntries: 2 });

    await cache.get('a', async () => 'a'); // expiresAt = 1000
    await cache.get('b', async () => 'b'); // expiresAt = 1000

    // Let both expire, then re-fetch 'a' so it becomes the most-recent write.
    vi.setSystemTime(1000);
    await cache.get('a', async () => 'a2'); // 'b' expired and reclaimed; 'a' renewed

    // Add 'c' at capacity: 'a' (just renewed) must survive over older keys.
    await cache.get('c', async () => 'c');
    const aFetcher = vi.fn(async () => 'a3');
    await cache.get('a', aFetcher);
    expect(aFetcher).toHaveBeenCalledTimes(0); // 'a' still cached
  });
});

describe('module singleton helpers', () => {
  it('exposes sane default constants', () => {
    expect(AUTH_CONTEXT_TTL_MS).toBe(30_000);
    expect(AUTH_CONTEXT_MAX_ENTRIES).toBeGreaterThan(0);
  });

  it('getAuthContext/invalidateAuthContext share one module-level cache', async () => {
    const fetcher = vi.fn(async () => 'singleton-value');

    const id = `user-${Math.random()}`; // unique key — module state persists across tests
    const a = await getAuthContext(id, fetcher);
    const b = await getAuthContext(id, fetcher);
    expect(b).toBe(a);
    expect(fetcher).toHaveBeenCalledTimes(1); // second call hit the cache

    invalidateAuthContext(id);
    await getAuthContext(id, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2); // re-fetched after invalidate
  });
});
