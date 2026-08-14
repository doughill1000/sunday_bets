import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSetVapidDetails, mockSendNotification, captureException } = vi.hoisted(() => ({
  mockSetVapidDetails: vi.fn(),
  mockSendNotification: vi.fn(),
  captureException: vi.fn()
}));

vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_VAPID_PUBLIC_KEY: 'test-pub' } }));
vi.mock('$env/dynamic/private', () => ({
  env: {
    VAPID_PRIVATE_KEY: 'test-priv',
    VAPID_SUBJECT: 'mailto:test@test'
  }
}));
vi.mock('@sentry/sveltekit', () => ({ captureException }));
vi.mock('web-push', () => ({
  default: { setVapidDetails: mockSetVapidDetails, sendNotification: mockSendNotification }
}));

type Sub = { id: string; endpoint: string; p256dh: string; auth_key: string };
let subsData: Sub[];
let deletedIds: string[] | null;

vi.mock('$lib/supabase/service', () => ({
  get supabaseService() {
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: subsData, error: null }))
        })),
        delete: vi.fn(() => ({
          in: vi.fn((_col: string, ids: string[]) => {
            deletedIds = ids;
            return Promise.resolve({ data: null, error: null });
          })
        }))
      }))
    };
  }
}));

import { sendToUser } from '../push';

beforeEach(() => {
  vi.clearAllMocks();
  subsData = [];
  deletedIds = null;
});

describe('sendToUser', () => {
  it('returns zero when the user has no subscriptions', async () => {
    subsData = [];
    const res = await sendToUser('u1', { title: 't', body: 'b' });
    // total: 0 is what makes this distinguishable from a total delivery failure (#815).
    expect(res).toEqual({ sent: 0, pruned: 0, total: 0 });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('sends to each subscription with the expected payload shape', async () => {
    subsData = [
      { id: 's1', endpoint: 'e1', p256dh: 'p1', auth_key: 'a1' },
      { id: 's2', endpoint: 'e2', p256dh: 'p2', auth_key: 'a2' }
    ];
    mockSendNotification.mockResolvedValue(undefined);

    const res = await sendToUser('u1', { title: 't', body: 'b', url: '/x' });

    expect(res).toEqual({ sent: 2, pruned: 0, total: 2 });
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: 'e1', keys: { p256dh: 'p1', auth: 'a1' } },
      JSON.stringify({ title: 't', body: 'b', url: '/x' })
    );
    expect(deletedIds).toBeNull();
  });

  it('prunes subscriptions on 410/404 and reports other errors to Sentry', async () => {
    subsData = [
      { id: 's1', endpoint: 'e1', p256dh: 'p1', auth_key: 'a1' },
      { id: 's2', endpoint: 'e2', p256dh: 'p2', auth_key: 'a2' },
      { id: 's3', endpoint: 'e3', p256dh: 'p3', auth_key: 'a3' }
    ];
    mockSendNotification
      .mockResolvedValueOnce(undefined) // s1 ok
      .mockRejectedValueOnce({ statusCode: 410 }) // s2 gone -> prune
      .mockRejectedValueOnce({ statusCode: 500 }); // s3 transient -> Sentry

    const res = await sendToUser('u1', { title: 't', body: 'b' });

    expect(res).toEqual({ sent: 1, pruned: 1, total: 3 });
    expect(deletedIds).toEqual(['s2']);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  // #815: the case the admin card used to misreport as "no active subscriptions".
  it('reports total delivery failure as sent 0 against a non-zero total', async () => {
    subsData = [
      { id: 's1', endpoint: 'e1', p256dh: 'p1', auth_key: 'a1' },
      { id: 's2', endpoint: 'e2', p256dh: 'p2', auth_key: 'a2' }
    ];
    mockSendNotification.mockRejectedValue({ statusCode: 403 });

    const res = await sendToUser('u1', { title: 't', body: 'b' });

    expect(res).toEqual({ sent: 0, pruned: 0, total: 2 });
    // Non-404/410 failures must still reach Sentry — one per subscription.
    expect(captureException).toHaveBeenCalledTimes(2);
    expect(deletedIds).toBeNull();
  });
});
