import { describe, expect, it, vi, beforeEach } from 'vitest';

// The weekly-recap endpoint's dependency. sendWeeklyRecap is the pass under test —
// this suite is about the endpoint's fan-out/error-isolation shape, not its (already
// unit-tested, see notifications.spec.ts) internal behavior.
const calls: string[] = [];
const SUMMARY = {
  results: { evaluated: 1, sent: 1, skipped: 0 },
  aiRecaps: { evaluated: 1, sent: 1, skipped: 0 },
  pushes: 1,
  delivered: 1
};
vi.mock('$lib/server/notifications', () => ({
  sendWeeklyRecap: vi.fn(async (weekId: number) => {
    calls.push(`sendWeeklyRecap:${weekId}`);
    return SUMMARY;
  })
}));

let recentWeeks: { id: number }[] = [];
vi.mock('$lib/server/db/queries/findRecentGradableWeeks', () => ({
  findRecentGradableWeeks: vi.fn(async () => recentWeeks)
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
import { sendWeeklyRecap } from '$lib/server/notifications';

const mockRecap = sendWeeklyRecap as ReturnType<typeof vi.fn>;

function makeEvent(): Parameters<typeof POST>[0] {
  return {
    request: new Request('http://localhost/api/cron/weekly-recap', { method: 'POST' })
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/cron/weekly-recap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    recentWeeks = [];
  });

  // #813 collapsed two passes into one: each recent week is now visited exactly once,
  // so the two post-grading concerns share a delivery instead of racing each other.
  it('runs one merged recap pass per recent week', async () => {
    recentWeeks = [{ id: 301 }, { id: 302 }];

    await POST(makeEvent());

    expect(mockRecap).toHaveBeenCalledWith(301);
    expect(mockRecap).toHaveBeenCalledWith(302);
    expect(calls).toEqual(['sendWeeklyRecap:301', 'sendWeeklyRecap:302']);
  });

  it('is a no-op when there is no recent week', async () => {
    recentWeeks = [];

    await POST(makeEvent());

    expect(mockRecap).not.toHaveBeenCalled();
  });

  it("isolates one week's failure from the others", async () => {
    recentWeeks = [{ id: 301 }, { id: 302 }];
    mockRecap.mockImplementationOnce(async () => {
      throw new Error('boom');
    });

    const response = await POST(makeEvent());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.recaps).toEqual([
      { weekId: 301, error: 'boom' },
      { weekId: 302, ...SUMMARY }
    ]);
  });
});
