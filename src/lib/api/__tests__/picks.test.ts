import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lockPick, unlockPick } from '../picks';

// Regression guard for the P0 in docs/audits/2026-07-09-error-handling-audit.md:
// `apiCall` throws on any non-2xx, but the picks store's recovery path expects a
// resolved `{ ok: false, reason }`. Before the fix, a 409/500 rejected the promise
// and the "Lock in" button hung on "Locking in…" forever. These tests assert the
// client wrappers RESOLVE (never throw) so the store can recover.

type FakeInit = { ok: boolean; status: number; statusText?: string; body?: unknown };

function fakeResponse({ ok, status, statusText = '', body }: FakeInit) {
  return {
    ok,
    status,
    statusText,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    }
  } as unknown as Response;
}

function mockFetch(init: FakeInit) {
  const fn = vi.fn(async () => fakeResponse(init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api/picks — lockPick', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('200: resolves the parsed success body', async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { ok: true, locked_at: '2025-09-01T00:00:00Z', applied: 2, skipped: [] }
    });

    const res = await lockPick('game-1', 'home', 'M');

    expect(res.ok).toBe(true);
    expect(res.applied).toBe(2);
  });

  it('409 (expected failure): RESOLVES {ok:false, reason} instead of throwing', async () => {
    mockFetch({
      ok: false,
      status: 409,
      body: { ok: false, reason: 'Game already started.' }
    });

    // The bug: this used to reject. Assert it resolves and carries the reason.
    const res = await lockPick('game-1', 'home', 'M');

    expect(res.ok).toBe(false);
    expect(res.reason).toBe('Game already started.');
  });

  it('500 (server error): resolves with the generic reason, never leaking internals', async () => {
    mockFetch({
      ok: false,
      status: 500,
      body: { ok: false, reason: 'Something went wrong. Please try again.' }
    });

    const res = await lockPick('game-1', 'home', 'M');

    expect(res.ok).toBe(false);
    expect(res.reason).toBe('Something went wrong. Please try again.');
  });

  it('unparseable error body: still resolves {ok:false} (falls back to statusText)', async () => {
    mockFetch({ ok: false, status: 502, statusText: 'Bad Gateway' /* no body */ });

    const res = await lockPick('game-1', 'home', 'M');

    expect(res.ok).toBe(false);
    expect(res.reason).toBeTruthy();
  });
});

describe('api/picks — unlockPick', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('200: resolves the parsed success body', async () => {
    mockFetch({ ok: true, status: 200, body: { ok: true, applied: 1, skipped: [] } });

    const res = await unlockPick('game-1');

    expect(res.ok).toBe(true);
  });

  it('409 (cannot unlock after kickoff): RESOLVES {ok:false, reason}', async () => {
    mockFetch({
      ok: false,
      status: 409,
      body: { ok: false, reason: 'Cannot unlock after kickoff.' }
    });

    const res = await unlockPick('game-1');

    expect(res.ok).toBe(false);
    expect(res.reason).toBe('Cannot unlock after kickoff.');
  });
});
