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

type Result<T> = { data: T | null; error: null | { message: string } };

/**
 * Builds a chainable Supabase query builder stub that resolves
 * `.maybeSingle()` with the provided result.
 */
function buildWeeksStub(result: Result<WeekRow>) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const lte = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ lte });
  return { select };
}

// games row shape used by the isWeekFullySettled gate
type GameRow = { id: string; final_scores: { home: number; away: number } | null };

function buildGamesStub(result: Result<GameRow[]>) {
  const neq = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ neq });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

function buildSettlementStub(result: Result<{ game_id: string }[]>) {
  const inFn = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ in: inFn });
  return { select };
}

/**
 * Routes `.from(table)` to the right stub by table name, so a single test can
 * mock the 'weeks' prior-week lookup alongside the 'games'/'pick_settlement'
 * queries the excludeSettledPriorWeek gate issues.
 */
function buildFromRouter(opts: {
  weeks: Result<WeekRow>;
  games?: Result<GameRow[]>;
  settlements?: Result<{ game_id: string }[]>;
}) {
  const weeksStub = buildWeeksStub(opts.weeks);
  const gamesStub = opts.games ? buildGamesStub(opts.games) : null;
  const settlementStub = opts.settlements ? buildSettlementStub(opts.settlements) : null;

  return vi.fn((table: string) => {
    if (table === 'weeks') return weeksStub;
    if (table === 'games' && gamesStub) return gamesStub;
    if (table === 'pick_settlement' && settlementStub) return settlementStub;
    throw new Error(`unexpected table access in test: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findRecentGradableWeeks', () => {
  it('returns both weeks when active week and prior week are different', async () => {
    const activeWeek = makeWeek({ id: 2, week_number: 2 });
    const priorWeek = makeWeek({ id: 1, week_number: 1 });

    findActiveWeekImpl = async () => activeWeek;
    mockFrom = buildFromRouter({ weeks: { data: priorWeek, error: null } });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(2);
    expect(result.map((w) => w.id).sort()).toEqual([1, 2]);
  });

  it('deduplicates when active week and prior week are the same (week boundary)', async () => {
    const week = makeWeek({ id: 5, week_number: 5 });

    findActiveWeekImpl = async () => week;
    // Prior week query returns the same row (end_ts just passed, same week still active)
    mockFrom = buildFromRouter({ weeks: { data: week, error: null } });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  it('returns only the prior week when there is no active week', async () => {
    const priorWeek = makeWeek({ id: 3, week_number: 3 });

    findActiveWeekImpl = async () => null;
    mockFrom = buildFromRouter({ weeks: { data: priorWeek, error: null } });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('returns empty array when there is no active week and no prior week (offseason)', async () => {
    findActiveWeekImpl = async () => null;
    mockFrom = buildFromRouter({ weeks: { data: null, error: null } });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('returns only the active week when there is no prior week (first week ever)', async () => {
    const activeWeek = makeWeek({ id: 1, week_number: 1 });

    findActiveWeekImpl = async () => activeWeek;
    // No prior weeks exist yet
    mockFrom = buildFromRouter({ weeks: { data: null, error: null } });

    const result = await findRecentGradableWeeks();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('throws when the prior week query returns an error', async () => {
    findActiveWeekImpl = async () => null;
    mockFrom = buildFromRouter({
      weeks: { data: null, error: { message: 'db connection failed' } }
    });

    await expect(findRecentGradableWeeks()).rejects.toMatchObject({
      message: 'db connection failed'
    });
  });

  describe('without excludeSettledPriorWeek (default: existing consumers unchanged)', () => {
    it('still returns a fully-settled prior week, without ever touching games/pick_settlement', async () => {
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => null;
      // No games/settlements stub provided — the router throws if the gate queries them,
      // proving the settledness check is skipped entirely when opts is omitted.
      mockFrom = buildFromRouter({ weeks: { data: priorWeek, error: null } });

      const result = await findRecentGradableWeeks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(14);
    });
  });

  describe('with excludeSettledPriorWeek: true (#744 grade-cron gate)', () => {
    it('drops the prior week once every game is final and settled', async () => {
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => null;
      mockFrom = buildFromRouter({
        weeks: { data: priorWeek, error: null },
        games: {
          data: [
            { id: 'g1', final_scores: { home: 20, away: 10 } },
            { id: 'g2', final_scores: { home: 7, away: 14 } }
          ],
          error: null
        },
        settlements: { data: [{ game_id: 'g1' }, { game_id: 'g2' }], error: null }
      });

      const result = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });

      expect(result).toEqual([]);
    });

    it('keeps the prior week when a non-postponed game has no final score yet', async () => {
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => null;
      mockFrom = buildFromRouter({
        weeks: { data: priorWeek, error: null },
        games: {
          data: [
            { id: 'g1', final_scores: { home: 20, away: 10 } },
            { id: 'g2', final_scores: null } // Monday-nighter not final yet
          ],
          error: null
        }
        // settlements stub intentionally omitted: must not even be queried in this branch
      });

      const result = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(14);
    });

    it('keeps the prior week when a final game has no settlement row yet', async () => {
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => null;
      mockFrom = buildFromRouter({
        weeks: { data: priorWeek, error: null },
        games: {
          data: [
            { id: 'g1', final_scores: { home: 20, away: 10 } },
            { id: 'g2', final_scores: { home: 7, away: 14 } }
          ],
          error: null
        },
        // g2's Monday-night final arrived after end_ts but hasn't been settled yet
        settlements: { data: [{ game_id: 'g1' }], error: null }
      });

      const result = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(14);
    });

    it('treats a week with only postponed/no games as settled (nothing left to grade)', async () => {
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => null;
      mockFrom = buildFromRouter({
        weeks: { data: priorWeek, error: null },
        games: { data: [], error: null }
        // settlements stub intentionally omitted: must not be queried when there are no final games
      });

      const result = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });

      expect(result).toEqual([]);
    });

    it('never gates the active week, even when it is also the prior-week candidate', async () => {
      const week = makeWeek({ id: 5, week_number: 5 });

      findActiveWeekImpl = async () => week;
      // No games/settlements stub provided — if the gate mistakenly ran the settledness
      // check against the active week's id, the router would throw and fail the test.
      mockFrom = buildFromRouter({ weeks: { data: week, error: null } });

      const result = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it('still includes both weeks when the active week is recent and the prior week is settled', async () => {
      const activeWeek = makeWeek({ id: 15, week_number: 1 });
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => activeWeek;
      mockFrom = buildFromRouter({
        weeks: { data: priorWeek, error: null },
        games: { data: [{ id: 'g1', final_scores: { home: 20, away: 10 } }], error: null },
        settlements: { data: [{ game_id: 'g1' }], error: null }
      });

      const result = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(15);
    });

    it('throws when the games completeness query errors', async () => {
      const priorWeek = makeWeek({ id: 14, week_number: 18 });

      findActiveWeekImpl = async () => null;
      mockFrom = buildFromRouter({
        weeks: { data: priorWeek, error: null },
        games: { data: null, error: { message: 'games query failed' } }
      });

      await expect(
        findRecentGradableWeeks({ excludeSettledPriorWeek: true })
      ).rejects.toMatchObject({ message: 'games query failed' });
    });
  });
});
