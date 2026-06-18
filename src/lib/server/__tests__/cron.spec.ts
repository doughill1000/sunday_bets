import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted runs before module evaluation so these refs are
// safe to use inside vi.mock factory functions.
// ---------------------------------------------------------------------------
const { captureException, mockSentryModule } = vi.hoisted(() => {
  const captureException = vi.fn();
  return { captureException, mockSentryModule: { captureException } };
});

// ---------------------------------------------------------------------------
// Mock $env/static/private before importing the SUT
// ---------------------------------------------------------------------------
vi.mock('$env/static/private', () => ({
  CRON_SECRET: 'test-secret'
}));

// ---------------------------------------------------------------------------
// Mock @sentry/sveltekit
// ---------------------------------------------------------------------------
vi.mock('@sentry/sveltekit', () => mockSentryModule);

// ---------------------------------------------------------------------------
// Mock $lib/supabase/service with a chainable builder
// ---------------------------------------------------------------------------

// Mutable handles so individual tests can override return values
let mockSingle: ReturnType<typeof vi.fn>;
let mockUpdate: ReturnType<typeof vi.fn>;
let mockEqUpdate: ReturnType<typeof vi.fn>;

vi.mock('$lib/supabase/service', () => {
  // We build the mock factory lazily so `mockSingle` etc. are initialised
  // before the first test runs.
  return {
    get supabaseService() {
      return {
        from: vi.fn().mockImplementation(() => ({
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockImplementation(() => ({
              single: () => mockSingle()
            }))
          })),
          update: vi.fn().mockImplementation((patch: unknown) => {
            mockUpdate(patch);
            return {
              eq: vi.fn().mockImplementation((_col: string, _id: number) => {
                mockEqUpdate(_col, _id);
                return Promise.resolve({ data: null, error: null });
              })
            };
          })
        }))
      };
    }
  };
});

// ---------------------------------------------------------------------------
// Import SUT after all mocks are set up
// ---------------------------------------------------------------------------
import { requireCronSecret, withCronLog } from '../cron';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(authHeader?: string): Parameters<typeof requireCronSecret>[0] {
  return {
    request: {
      headers: {
        get: (name: string) => (name === 'Authorization' ? (authHeader ?? null) : null)
      }
    }
    // Only the properties we need; cast to full RequestEvent via unknown
  } as unknown as Parameters<typeof requireCronSecret>[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default: successful log-row insert returning id=1
  mockSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
  mockUpdate = vi.fn();
  mockEqUpdate = vi.fn();
});

describe('requireCronSecret', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = requireCronSecret(makeEvent()); // no header
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body).toEqual({ ok: false, reason: 'Unauthorized' });
  });

  it('returns 401 when the token is wrong', async () => {
    const res = requireCronSecret(makeEvent('Bearer wrong-secret'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body).toEqual({ ok: false, reason: 'Unauthorized' });
  });

  it('returns 401 when the scheme prefix is missing', async () => {
    const res = requireCronSecret(makeEvent('test-secret')); // no "Bearer " prefix
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns null when Authorization header matches exactly', () => {
    const res = requireCronSecret(makeEvent('Bearer test-secret'));
    expect(res).toBeNull();
  });

  it('fails closed (401) when CRON_SECRET is blank', async () => {
    // A blank secret makes `expected` collapse to "Bearer "; a request sending
    // exactly that must still be rejected, not authenticated.
    vi.resetModules();
    vi.doMock('$env/static/private', () => ({ CRON_SECRET: '' }));
    try {
      const { requireCronSecret: guard } = await import('../cron');
      const res = guard(makeEvent('Bearer '));
      expect(res).not.toBeNull();
      expect(res!.status).toBe(401);
      const body = await res!.json();
      expect(body).toEqual({ ok: false, reason: 'Unauthorized' });
    } finally {
      vi.doUnmock('$env/static/private');
      vi.resetModules();
    }
  });
});

describe('withCronLog', () => {
  it('success path: inserts log row, calls fn, updates with ok=true, returns result', async () => {
    const payload = { count: 3 };
    const fn = vi.fn().mockResolvedValue(payload);

    const outcome = await withCronLog('test-job', fn);

    // fn was called
    expect(fn).toHaveBeenCalledOnce();

    // Result shape
    expect(outcome).toEqual({ ok: true, result: payload });

    // Update was called with ok=true and the result as summary
    expect(mockUpdate).toHaveBeenCalledOnce();
    const patch = mockUpdate.mock.calls[0][0];
    expect(patch.ok).toBe(true);
    expect(patch.summary).toEqual(payload);
    expect(patch.finished_at).toBeDefined();

    // eq was called with the log row id
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 1);

    // No Sentry call on the happy path
    expect(captureException).not.toHaveBeenCalled();
  });

  it('error path: calls Sentry.captureException, updates with ok=false, returns error shape', async () => {
    const boom = new Error('something went wrong');
    const fn = vi.fn().mockRejectedValue(boom);

    const outcome = await withCronLog('failing-job', fn);

    // fn was called
    expect(fn).toHaveBeenCalledOnce();

    // Result shape
    expect(outcome).toEqual({ ok: false, error: 'something went wrong' });

    // Sentry was notified
    expect(captureException).toHaveBeenCalledWith(boom);

    // Update was called with ok=false and the error message
    expect(mockUpdate).toHaveBeenCalledOnce();
    const patch = mockUpdate.mock.calls[0][0];
    expect(patch.ok).toBe(false);
    expect(patch.error).toBe('something went wrong');
    expect(patch.finished_at).toBeDefined();

    // eq was called with the log row id
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 1);
  });

  it('still runs fn and returns result even if the insert fails', async () => {
    // Simulate a failed insert (no id returned, error present)
    mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'insert failed' }
    });

    const payload = { ok: true };
    const fn = vi.fn().mockResolvedValue(payload);

    const outcome = await withCronLog('job-with-bad-insert', fn);

    // fn still ran
    expect(fn).toHaveBeenCalledOnce();
    expect(outcome).toEqual({ ok: true, result: payload });

    // Sentry captured the insert error
    expect(captureException).toHaveBeenCalledOnce();

    // No update attempted (no id to update)
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
