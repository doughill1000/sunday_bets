import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above module scope, so the mock fns it references must be
// created with vi.hoisted (which runs first) to avoid a TDZ error. The mock records
// inserted rows so the tests can assert on the server-stamped payload.
const { from, insert, inserted } = vi.hoisted(() => {
  const inserted: Record<string, unknown>[] = [];
  const insert = vi.fn(async (row: Record<string, unknown>) => {
    inserted.push(row);
    return { error: null };
  });
  const from = vi.fn(() => ({ insert }));
  return { from, insert, inserted };
});
vi.mock('$lib/supabase/service', () => ({ supabaseService: { from } }));

import { POST } from '../+server';

type PostEvent = Parameters<typeof POST>[0];

function makeEvent(user: { id: string } | null, jsonBody: unknown): PostEvent {
  return {
    locals: {
      user,
      getCurrentSeasonYear: vi.fn(async () => 2026)
    },
    request: { json: async () => jsonBody }
  } as unknown as PostEvent;
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    from.mockClear();
    insert.mockClear();
    inserted.length = 0;
  });

  it('rejects an unauthenticated request with 401 and never writes', async () => {
    const res = await POST(makeEvent(null, { body: 'anything' }));
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects an empty body with 400 and never writes', async () => {
    const res = await POST(makeEvent({ id: 'u1' }, { body: '   ' }));
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('stores a row with server-stamped identity + season for an authed submission', async () => {
    const res = await POST(makeEvent({ id: 'u1' }, { body: 'love it', kind: 'love' }));
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith('feedback');

    const row = inserted[0] as {
      user_id: string;
      kind: string;
      body: string;
      context: { userId: string; seasonYear: number | null };
    };
    expect(row.user_id).toBe('u1');
    expect(row.kind).toBe('love');
    expect(row.body).toBe('love it');
    expect(row.context.userId).toBe('u1');
    expect(row.context.seasonYear).toBe(2026);
  });

  it('falls back to kind "idea" for an unknown kind', async () => {
    await POST(makeEvent({ id: 'u1' }, { body: 'hi', kind: 'nonsense' }));
    const row = inserted[0] as { kind: string };
    expect(row.kind).toBe('idea');
  });
});
