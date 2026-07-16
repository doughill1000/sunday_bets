import { describe, expect, it, vi, beforeEach } from 'vitest';

// The weekly-recap endpoint's dependencies. sendResultsRecap/sendAIRecapPushes are the pair
// under test — this suite is about the endpoint's fan-out/error-isolation shape, not their
// (already unit-tested, see notifications.spec.ts) internal behavior.
const calls: string[] = [];
vi.mock('$lib/server/notifications', () => ({
  sendResultsRecap: vi.fn(async (weekId: number) => {
    calls.push(`sendResultsRecap:${weekId}`);
    return { evaluated: 1, sent: 1, skipped: 0 };
  }),
  sendAIRecapPushes: vi.fn(async (weekId: number) => {
    calls.push(`sendAIRecapPushes:${weekId}`);
    return { evaluated: 1, sent: 1, skipped: 0 };
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
import { sendResultsRecap, sendAIRecapPushes } from '$lib/server/notifications';

const mockRecap = sendResultsRecap as ReturnType<typeof vi.fn>;
const mockAiRecapPush = sendAIRecapPushes as ReturnType<typeof vi.fn>;

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

  it('pushes results recap + AI recap for every recent week', async () => {
    recentWeeks = [{ id: 301 }, { id: 302 }];

    await POST(makeEvent());

    expect(mockRecap).toHaveBeenCalledWith(301);
    expect(mockRecap).toHaveBeenCalledWith(302);
    expect(mockAiRecapPush).toHaveBeenCalledWith(301);
    expect(mockAiRecapPush).toHaveBeenCalledWith(302);
  });

  it('is a no-op when there is no recent week', async () => {
    recentWeeks = [];

    await POST(makeEvent());

    expect(mockRecap).not.toHaveBeenCalled();
    expect(mockAiRecapPush).not.toHaveBeenCalled();
  });

  it("isolates one week's recap failure from the others and from AI recap pushes", async () => {
    recentWeeks = [{ id: 301 }, { id: 302 }];
    mockRecap.mockImplementationOnce(async () => {
      throw new Error('boom');
    });

    const response = await POST(makeEvent());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.recaps).toEqual([
      { weekId: 301, error: 'boom' },
      { weekId: 302, evaluated: 1, sent: 1, skipped: 0 }
    ]);
    expect(mockAiRecapPush).toHaveBeenCalledWith(301);
    expect(mockAiRecapPush).toHaveBeenCalledWith(302);
  });
});
