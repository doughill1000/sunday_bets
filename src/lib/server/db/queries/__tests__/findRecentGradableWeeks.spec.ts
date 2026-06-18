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

// Mock findActiveWeek so we can control it independently of supabaseService
let findActiveWeekImpl: () => Promise<WeekRow | null>;

vi.mock('../findActiveWeek', () => ({
  findActiveWeek: () => findActiveWeekImpl()
}));

// Import after mocks are defined
import { findRecentGradableWeeks } from '../findRecentGradableWeeks';

// Minimal shape of a weeks row used in tests
type WeekRow = {
  id: number;
  week_number: number;
  start_ts: string;
  end_ts: string;
  season_id: number;
};

function makeWeek(overrides: Partial<WeekRow> = {}): WeekRow {
  return {
    id: 1,
    week_number: 1,
    start_ts: '2024-09-05T00:00:00Z',
    end_ts: '2024-09-10T00:00:00Z',
    season_id: 2024,
    ...overrides
  };
}

/**
 * Builds a chainable Supabase query builder stub that resolves
 * `.maybeSingle()` with the provided result.
 */
function buildFromStub(result: { data: WeekRow | null; error: null | { message: string } }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const lte = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ lte });
  return vi.fn().mockReturnValue({ select });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findRecentGradableWeeks', () => {
  it('returns both weeks when active week and prior week are different', async () => {
    const activeWeek = makeWeek({ id: 2, week_number: 2 });
    const priorWeek = makeWeek({ id: 1, week_number: 1 });

    findActiveWeekImpl = async () => activeWeek;
    mockFrom = buildFromStub({ data: priorWeek, error: null });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(2);
    expect(result.map((w) => w.id).sort()).toEqual([1, 2]);
  });

  it('deduplicates when active week and prior week are the same (week boundary)', async () => {
    const week = makeWeek({ id: 5, week_number: 5 });

    findActiveWeekImpl = async () => week;
    // Prior week query returns the same row (end_ts just passed, same week still active)
    mockFrom = buildFromStub({ data: week, error: null });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  it('returns only the prior week when there is no active week', async () => {
    const priorWeek = makeWeek({ id: 3, week_number: 3 });

    findActiveWeekImpl = async () => null;
    mockFrom = buildFromStub({ data: priorWeek, error: null });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('returns empty array when there is no active week and no prior week (offseason)', async () => {
    findActiveWeekImpl = async () => null;
    mockFrom = buildFromStub({ data: null, error: null });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('returns only the active week when there is no prior week (first week ever)', async () => {
    const activeWeek = makeWeek({ id: 1, week_number: 1 });

    findActiveWeekImpl = async () => activeWeek;
    // No prior weeks exist yet
    mockFrom = buildFromStub({ data: null, error: null });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('throws when the prior week query returns an error', async () => {
    findActiveWeekImpl = async () => null;
    mockFrom = buildFromStub({ data: null, error: { message: 'db connection failed' } });

    await expect(findRecentGradableWeeks()).rejects.toMatchObject({
      message: 'db connection failed'
    });
  });
});
