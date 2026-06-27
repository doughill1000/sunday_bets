// src/lib/server/auth-context-cache.ts
//
// Short-TTL, per-instance cache for the two auth-hook lookups (`users` profile +
// `group_memberships`) that `injectSession` (`src/hooks.server.ts`) runs on every
// authenticated request. Modeled on the lazy module-singleton idiom in
// `src/lib/supabase/service.ts`: a module-level `Map` keyed by `user.id` that
// survives across requests within a warm serverless instance (adapter-vercel's
// default Node runtime), degrading gracefully to a miss on a cold instance.
//
// This cache is a LATENCY OPTIMIZATION, NEVER A SECURITY BOUNDARY. See ADR-0014:
//   - RLS + the `group_id` filter remain the real data boundary.
//   - Privileged/admin operations re-read `users.role` UNCACHED (`requireAdmin`).
//   - Session validation (`getUser()`) stays per-request and is never cached here.
//   - `groupId` is derived per-request from the cookie, not from this cache.
//
// The value stored is opaque to the cache (`getAuthContext` is generic over `T`):
// the caller stores the raw `{ profile, memberships }` query results and does all
// derivation downstream, so the cache never needs to understand auth shape.

/** Default staleness budget for a cached auth context (~30s — see ADR-0014). */
export const AUTH_CONTEXT_TTL_MS = 30_000;

/**
 * Upper bound on cached entries per instance. Each entry is a small object, so
 * this is a generous safety net against unbounded growth (e.g. a churn of many
 * distinct users on one warm instance), not a tuning knob. Eviction drops
 * expired entries first, then the oldest, so the cap is rarely reached in
 * practice. See ADR-0014 ("Memory growth is bounded by lazy TTL expiry plus a
 * size cap").
 */
export const AUTH_CONTEXT_MAX_ENTRIES = 10_000;

interface CacheEntry<T> {
  value: T;
  /** Absolute `Date.now()` ms after which the entry is stale. */
  expiresAt: number;
}

export interface AuthContextCache {
  /**
   * Return the cached value for `userId` if present and unexpired; otherwise run
   * `fetcher`, store its result with a fresh TTL, and return it. Concurrent
   * misses for the same key each run `fetcher` (no single-flight) — acceptable
   * because the fetch is idempotent and the window is tiny.
   */
  get<T>(userId: string, fetcher: () => Promise<T>): Promise<T>;
  /** Drop any cached entry for `userId` (defense-in-depth bust-on-write). */
  invalidate(userId: string): void;
  /** Current entry count — primarily for tests/observability. */
  size(): number;
}

/**
 * Build an isolated cache instance. The default singleton below uses the module
 * constants; tests construct their own with a tiny `ttlMs`/`maxEntries` so TTL
 * expiry and size-cap eviction are deterministic without fake timers or large
 * loops.
 */
export function createAuthContextCache(
  opts: { ttlMs?: number; maxEntries?: number } = {}
): AuthContextCache {
  const ttlMs = opts.ttlMs ?? AUTH_CONTEXT_TTL_MS;
  const maxEntries = opts.maxEntries ?? AUTH_CONTEXT_MAX_ENTRIES;

  // Insertion order in a Map is preserved, so the first key is always the
  // oldest-written entry — exactly what "evict oldest" needs.
  const entries = new Map<string, CacheEntry<unknown>>();

  function evictToCapacity(now: number): void {
    // First pass: reclaim anything already expired — cheap and often enough.
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key);
    }
    // Still over budget: drop oldest-first until there is room for one more.
    while (entries.size >= maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  async function get<T>(userId: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = entries.get(userId);
    if (existing && now < existing.expiresAt) {
      return existing.value as T;
    }

    const value = await fetcher();

    // Re-key on write so a refreshed entry counts as most-recently-written for
    // the oldest-first eviction order, then enforce the cap before inserting.
    entries.delete(userId);
    if (entries.size >= maxEntries) {
      evictToCapacity(Date.now());
    }
    entries.set(userId, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  function invalidate(userId: string): void {
    entries.delete(userId);
  }

  function size(): number {
    return entries.size;
  }

  return { get, invalidate, size };
}

// Module-level singleton shared across requests within a warm instance.
const defaultCache = createAuthContextCache();

/**
 * Cached fetch of the auth context for `userId`. On a miss, `fetcher` runs and
 * its result is cached for `AUTH_CONTEXT_TTL_MS`; on a hit within the TTL, the
 * cached value is returned and `fetcher` does not run. Keep the #190 trace
 * wrappers INSIDE `fetcher` at the call site so a hit emits no DB spans.
 */
export function getAuthContext<T>(userId: string, fetcher: () => Promise<T>): Promise<T> {
  return defaultCache.get(userId, fetcher);
}

/**
 * Evict the cached auth context for `userId`. Wired as bust-on-write from the
 * local mutations that change cached fields — `create_group` / `redeem_invite`
 * (join flows), the `guide-seen` and avatar `profile` endpoints, and
 * `leave_group` / `remove_member` / `promote_member` — so a write takes effect
 * on the next request instead of at TTL expiry (ADR-0014, "Bust-on-write").
 * Self mutations are fully effective; cross-user ones are best-effort per
 * instance. Admin role changes have no in-app write, so role staleness is
 * handled by the `requireAdmin` fresh re-check, not by this.
 */
export function invalidateAuthContext(userId: string): void {
  defaultCache.invalidate(userId);
}
