import { describe, expect, it, vi } from 'vitest';
import { PUT } from '../+server';

function makeEvent({
  body,
  user = { id: 'user-123', email: 'doug@example.com' },
  signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null
  }),
  updateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
}: {
  body?: unknown;
  user?: { id: string; email?: string } | null;
  signInWithPassword?: ReturnType<typeof vi.fn>;
  updateUser?: ReturnType<typeof vi.fn>;
} = {}): Parameters<typeof PUT>[0] {
  return {
    request: new Request('http://localhost/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify(body ?? {}),
      headers: { 'Content-Type': 'application/json' }
    }),
    locals: {
      user,
      supabase: {
        auth: {
          signInWithPassword,
          updateUser
        }
      }
    }
  } as unknown as Parameters<typeof PUT>[0];
}

describe('PUT /api/profile/password', () => {
  it('requires an authenticated user', async () => {
    const response = await PUT(makeEvent({ user: null }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'Not authenticated'
    });
  });

  it('validates required password fields before calling Supabase', async () => {
    const signInWithPassword = vi.fn();
    const updateUser = vi.fn();

    const response = await PUT(
      makeEvent({
        body: { current_password: '', new_password: 'new-password-123' },
        signInWithPassword,
        updateUser
      })
    );

    expect(response.status).toBe(400);
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', status: 400 }
    });
    const updateUser = vi.fn();

    const response = await PUT(
      makeEvent({
        body: { current_password: 'wrong-password', new_password: 'new-password-123' },
        signInWithPassword,
        updateUser
      })
    );

    expect(response.status).toBe(400);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'doug@example.com',
      password: 'wrong-password'
    });
    expect(updateUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'Current password is incorrect.'
    });
  });

  it('updates the signed-in Supabase user password after verifying the current password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    const updateUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    const response = await PUT(
      makeEvent({
        body: { current_password: 'old-password-123', new_password: 'new-password-123' },
        signInWithPassword,
        updateUser
      })
    );

    expect(response.status).toBe(200);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'doug@example.com',
      password: 'old-password-123'
    });
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
