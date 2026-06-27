// Keyset (cursor) pagination helpers shared by the leaderboard and members queries
// (issue #152, ADR-0002). The cursor is an opaque base64url-encoded JSON snapshot of
// the last row's ordering tuple; callers never construct or parse it by hand. Keyset
// (vs offset) keeps pages stable under concurrent inserts and bounds every read to a
// single index range scan regardless of group size.

/** Default page size. Comfortably covers every real group (~6 members) in one page. */
export const DEFAULT_PAGE_SIZE = 50;

/** Hard ceiling on a requested page size, mirroring the RPC's own `least(..., 200)` cap. */
export const MAX_PAGE_SIZE = 100;

/**
 * Encode an ordering tuple into an opaque cursor string. Keys are kept short because
 * the value is round-tripped through the URL.
 */
export function encodeCursor(value: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/**
 * Decode a cursor produced by {@link encodeCursor}. Returns `null` for a missing or
 * malformed cursor so callers fall back to the first page rather than throwing on a
 * hand-edited query string.
 */
export function decodeCursor<T>(cursor: string | null | undefined): T | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/**
 * Clamp a requested limit into [1, MAX_PAGE_SIZE], defaulting to DEFAULT_PAGE_SIZE for
 * a missing or non-finite value. The server is the only caller of the page RPCs, so
 * this is the real bound on page size (the RPC's `least(..., 200)` is a backstop).
 */
export function clampLimit(limit?: number | null): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}
