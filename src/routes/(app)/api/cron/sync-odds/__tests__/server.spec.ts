import { describe, expect, it, vi, beforeEach } from 'vitest';

// syncOddsForActiveWeek is the unit under test's dependency — mock it so each
// case controls whether the job returns a structured skip, a success, or throws.
vi.mock('$lib/server/oddsSync', () => ({
  syncOddsForActiveWeek: vi.fn()
}));

// Guard always passes here (auth is covered by cron.spec.ts). withCronLog is
// replaced with a faithful pass-through of its real contract: run the job, wrap
// a returned value as { ok: true, result }, and only report { ok: false } when
// the job *throws*. This keeps the test focused on the endpoint's own decision —
// does it throw on a structured skip? — without re-exercising Supabase logging.
vi.mock('$lib/server/cron', () => ({
  requireCronSecret: vi.fn(() => null),
  withCronLog: vi.fn(async (_job: string, fn: () => Promise<unknown>) => {
    try {
      return { ok: true, result: await fn() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  })
}));

import { POST } from '../+server';
import { syncOddsForActiveWeek } from '$lib/server/oddsSync';

const mockSync = syncOddsForActiveWeek as ReturnType<typeof vi.fn>;

function makeEvent(): Parameters<typeof POST>[0] {
  return {
    request: new Request('http://localhost/api/cron/sync-odds', { method: 'POST' })
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/cron/sync-odds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The reported Sentry noise: offseason cron runs threw "No active week", which
  // paged Sentry and returned 500. A structured skip must now be a clean 200.
  it('returns 200 without failing the run when there is no active week', async () => {
    mockSync.mockResolvedValue({ ok: false, reason: 'No active week' });

    const response = await POST(makeEvent());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: { ok: false, reason: 'No active week' }
    });
  });

  it('returns 200 when the monthly Odds-API cap is reached', async () => {
    mockSync.mockResolvedValue({ ok: false, reason: 'Odds API monthly call cap reached' });

    const response = await POST(makeEvent());

    expect(response.status).toBe(200);
  });

  it('returns 200 with the sync stats on a successful sync', async () => {
    const stats = {
      ok: true,
      count: 2,
      totalGames: 16,
      processed: 16,
      unchanged: 14,
      skippedNoTeams: 0,
      skippedNoSpread: 0,
      skippedNoMatchup: 0
    };
    mockSync.mockResolvedValue(stats);

    const response = await POST(makeEvent());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, result: stats });
  });

  // A genuine fault (DB/network) still surfaces: withCronLog reports it to Sentry
  // and the endpoint returns 500. Only real exceptions should page.
  it('returns 500 when the job throws a real error', async () => {
    mockSync.mockRejectedValue(new Error('db exploded'));

    const response = await POST(makeEvent());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'db exploded' });
  });
});
