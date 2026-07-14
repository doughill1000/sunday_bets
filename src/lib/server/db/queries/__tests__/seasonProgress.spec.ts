import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- supabaseService mock (must be defined before module imports) ---

let mockFrom: ReturnType<typeof vi.fn>;

vi.mock('$lib/supabase/service', () => ({
  supabaseService: new Proxy(
    {},
    {
      get(_: object, prop: string) {
        if (prop === 'from') return mockFrom;
        return undefined;
      }
    }
  )
}));

import { isSeasonInProgress } from '../seasonProgress';

type Row = { id: number };

/**
 * Builds a chainable Supabase query builder stub for the
 * `.select().eq().eq().gte().limit()` chain.
 */
function buildFromStub(result: { data: Row[] | null; error: null | { message: string } }) {
  const limit = vi.fn().mockResolvedValue(result);
  const gte = vi.fn().mockReturnValue({ limit });
  const eq2 = vi.fn().mockReturnValue({ gte });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return vi.fn().mockReturnValue({ select });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isSeasonInProgress', () => {
  it('is true when a scoring week has not concluded yet (active or upcoming)', async () => {
    mockFrom = buildFromStub({ data: [{ id: 1 }], error: null });

    expect(await isSeasonInProgress(2026)).toBe(true);
  });

  it('is false when every scoring week has already concluded', async () => {
    mockFrom = buildFromStub({ data: [], error: null });

    expect(await isSeasonInProgress(2025)).toBe(false);
  });

  it('is false when the season has no weeks at all', async () => {
    mockFrom = buildFromStub({ data: null, error: null });

    expect(await isSeasonInProgress(2027)).toBe(false);
  });

  it('throws when the query errors', async () => {
    mockFrom = buildFromStub({ data: null, error: { message: 'db connection failed' } });

    await expect(isSeasonInProgress(2025)).rejects.toMatchObject({
      message: 'db connection failed'
    });
  });
});
