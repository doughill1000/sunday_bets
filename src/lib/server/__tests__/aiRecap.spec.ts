import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable Supabase-query mock in the shape notifications.spec.ts uses: every filter
// returns the builder and the terminal value is resolved from the per-test `db` fixture,
// keyed by table.
type BuilderState = { table: string };

let db: {
  week: { is_scoring: boolean; week_number: number; seasons: { year: number } } | null;
  gameRows: { id: string }[];
  pickRows: { group_id: string }[];
  configRows: { group_id: string; ai_recaps_enabled: boolean }[];
};

function resolve(state: BuilderState) {
  switch (state.table) {
    case 'weeks':
      return { data: db.week, error: null };
    case 'games':
      return { data: db.gameRows, error: null };
    case 'picks':
      return { data: db.pickRows, error: null };
    case 'group_config':
      return { data: db.configRows, error: null };
    default:
      return { data: [], error: null };
  }
}

function makeBuilder(table: string) {
  const state: BuilderState = { table };
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    not: () => builder,
    single: () => Promise.resolve(resolve(state)),
    maybeSingle: () => Promise.resolve(resolve(state)),
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(resolve(state)).then(onF, onR)
  };
  return builder;
}

const { isWeekFullyGraded, buildRecapFacts, generateRecapProse, upsertRecap, getRecapForWeek } =
  vi.hoisted(() => ({
    isWeekFullyGraded: vi.fn(),
    buildRecapFacts: vi.fn(),
    generateRecapProse: vi.fn(),
    upsertRecap: vi.fn(),
    getRecapForWeek: vi.fn()
  }));

// Stubbed so the specs drive the completeness gate directly rather than through the
// games/final_scores count.
vi.mock('$lib/server/db/queries/isWeekFullyGraded', () => ({ isWeekFullyGraded }));
vi.mock('$lib/server/recap/facts', () => ({ buildRecapFacts }));
vi.mock('$lib/server/recap/voice', () => ({ generateRecapProse }));
vi.mock('$lib/server/db/queries/recaps', () => ({ upsertRecap, getRecapForWeek }));
vi.mock('$lib/supabase/service', () => ({
  get supabaseService() {
    return { from: (table: string) => makeBuilder(table) };
  }
}));

import { sendAIRecaps } from '../aiRecap';

const EMPTY = { evaluated: 0, generated: 0, fallback: 0, skipped: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  db = {
    week: { is_scoring: true, week_number: 5, seasons: { year: 2026 } },
    gameRows: [{ id: 'g1' }],
    pickRows: [{ group_id: 'grp1' }],
    configRows: [{ group_id: 'grp1', ai_recaps_enabled: true }]
  };
  isWeekFullyGraded.mockResolvedValue(true);
  getRecapForWeek.mockResolvedValue(null);
  buildRecapFacts.mockResolvedValue({ group_id: 'grp1', week_number: 5 });
  generateRecapProse.mockResolvedValue({
    prose: 'Somebody ran the table.',
    is_fallback: false,
    model: 'test/model',
    prompt_tokens: 1,
    completion_tokens: 1
  });
});

describe('sendAIRecaps', () => {
  it('generates and persists one recap for a fully-graded scoring week', async () => {
    const res = await sendAIRecaps(5);

    expect(res).toEqual({ evaluated: 1, generated: 1, fallback: 0, skipped: 0 });
    expect(upsertRecap).toHaveBeenCalledTimes(1);
    expect(upsertRecap).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'grp1', seasonYear: 2026, weekNumber: 5 })
    );
  });

  it('is a no-op on a non-scoring round even when fully graded (#789)', async () => {
    // A preseason week (ADR-0016): negative week_number, is_scoring false. Its single
    // game going final makes isWeekFullyGraded true immediately — the gate that used to
    // be the only one — so the scoring gate is what has to stop it.
    db.week = { is_scoring: false, week_number: -1, seasons: { year: 2026 } };

    const res = await sendAIRecaps(112);

    expect(res).toEqual(EMPTY);
    expect(upsertRecap).not.toHaveBeenCalled();
    expect(generateRecapProse).not.toHaveBeenCalled();
    // Short-circuits before the completeness check, so no work is done at all.
    expect(isWeekFullyGraded).not.toHaveBeenCalled();
  });

  it('is a no-op when the week does not exist', async () => {
    db.week = null;

    const res = await sendAIRecaps(9999);

    expect(res).toEqual(EMPTY);
    expect(upsertRecap).not.toHaveBeenCalled();
  });

  it('still no-ops on a scoring week that is not fully graded', async () => {
    isWeekFullyGraded.mockResolvedValue(false);

    const res = await sendAIRecaps(5);

    expect(res).toEqual(EMPTY);
    expect(upsertRecap).not.toHaveBeenCalled();
  });
});
