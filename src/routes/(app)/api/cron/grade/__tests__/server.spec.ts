import { describe, expect, it, vi, beforeEach } from 'vitest';

// The grade endpoint's dependencies. gradeWeek + refreshReadModels are the pair under test (#622):
// each week is graded with the whole-table refresh SUPPRESSED, and refreshReadModels runs once for
// the whole run. The recap/notification fan-out is stubbed to no-ops — this suite is about the
// refresh call shape, not their behavior.
const calls: string[] = [];
vi.mock('$lib/server/grading', () => ({
  gradeWeek: vi.fn(async (weekId: number, opts?: { skipReadModelRefresh?: boolean }) => {
    calls.push(`gradeWeek:${weekId}:${opts?.skipReadModelRefresh ? 'skip' : 'refresh'}`);
    return { ok: true, week_id: weekId, gamesGraded: 0, picksSettled: 0 };
  }),
  refreshReadModels: vi.fn(async () => {
    calls.push('refreshReadModels');
  })
}));

vi.mock('$lib/server/aiRecap', () => ({
  sendAIRecaps: vi.fn(async () => {
    calls.push('sendAIRecaps');
    return {};
  })
}));
vi.mock('$lib/server/seasonWrapped', () => ({ sendSeasonWrappeds: vi.fn(async () => ({})) }));
vi.mock('$lib/server/badgeFlavor', () => ({ sendBadgeFlavors: vi.fn(async () => ({})) }));

let recentWeeks: { id: number }[] = [];
let unsettledWeeks: { id: number }[] = [];
vi.mock('$lib/server/db/queries/findRecentGradableWeeks', () => ({
  findRecentGradableWeeks: vi.fn(async () => recentWeeks)
}));
vi.mock('$lib/server/db/queries/findUnsettledGradableWeeks', () => ({
  findUnsettledGradableWeeks: vi.fn(async () => unsettledWeeks)
}));

vi.mock('$lib/server/cron', () => ({
  requireCronSecret: vi.fn(() => null),
  withCronLog: vi.fn(async (_job: string, fn: () => Promise<unknown>) => ({
    ok: true,
    result: await fn()
  }))
}));

vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

import { POST } from '../+server';
import { gradeWeek, refreshReadModels } from '$lib/server/grading';
import { findRecentGradableWeeks } from '$lib/server/db/queries/findRecentGradableWeeks';

const mockGradeWeek = gradeWeek as ReturnType<typeof vi.fn>;
const mockRefresh = refreshReadModels as ReturnType<typeof vi.fn>;
const mockFindRecentGradableWeeks = findRecentGradableWeeks as ReturnType<typeof vi.fn>;

function makeEvent(): Parameters<typeof POST>[0] {
  return {
    request: new Request('http://localhost/api/cron/grade', { method: 'POST' })
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/cron/grade — hoisted read-model refresh (#622)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    recentWeeks = [];
    unsettledWeeks = [];
  });

  it('refreshes the read models exactly once even when grading several weeks', async () => {
    recentWeeks = [{ id: 301 }, { id: 302 }];

    await POST(makeEvent());

    expect(mockGradeWeek).toHaveBeenCalledTimes(2);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('grades every week with the per-week refresh suppressed', async () => {
    recentWeeks = [{ id: 301 }, { id: 302 }];
    unsettledWeeks = [{ id: 250 }];

    await POST(makeEvent());

    // Recent weeks pull scores; the reconcile week just settles. Both suppress the refresh.
    expect(mockGradeWeek).toHaveBeenCalledWith(301, {
      refreshScores: true,
      daysFrom: 3,
      skipReadModelRefresh: true
    });
    expect(mockGradeWeek).toHaveBeenCalledWith(250, { skipReadModelRefresh: true });
    expect(calls.filter((c) => c.endsWith(':refresh'))).toHaveLength(0);
  });

  it('runs the single refresh after every grade (incl. reconcile) and before the AI recap', async () => {
    recentWeeks = [{ id: 301 }];
    unsettledWeeks = [{ id: 250 }];

    await POST(makeEvent());

    const refreshAt = calls.indexOf('refreshReadModels');
    const lastGradeAt = calls.map((c) => c.startsWith('gradeWeek:')).lastIndexOf(true);
    const aiRecapAt = calls.indexOf('sendAIRecaps');

    expect(refreshAt).toBeGreaterThan(lastGradeAt); // after all weeks (recent + reconcile) settled
    expect(aiRecapAt).toBeGreaterThan(refreshAt); // AI recap reads the freshly-refreshed matviews
  });

  it('still refreshes once when there are no reconcile weeks', async () => {
    recentWeeks = [{ id: 301 }];

    await POST(makeEvent());

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('opts into the settled-prior-week gate (#744) so a finished season stops regrading', async () => {
    recentWeeks = [];

    await POST(makeEvent());

    expect(mockFindRecentGradableWeeks).toHaveBeenCalledWith({ excludeSettledPriorWeek: true });
  });
});
