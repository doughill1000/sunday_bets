import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const MIN_PASSWORD_LENGTH = 8;

function getAuthErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status;
    if (typeof status === 'number' && status >= 400 && status < 500) return status;
  }
  return 500;
}

function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return 'Could not update password.';
}

export const PUT: RequestHandler = async (event) => {
  const { supabase, user } = event.locals;
  if (!user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 });
  if (!user.email)
    return json({ ok: false, reason: 'Account email is unavailable.' }, { status: 400 });

  const raw = await event.request.json().catch(() => ({}));
  const currentPassword =
    raw != null && typeof raw === 'object' && 'current_password' in raw
      ? raw.current_password
      : null;
  const newPassword =
    raw != null && typeof raw === 'object' && 'new_password' in raw ? raw.new_password : null;

  if (
    typeof currentPassword !== 'string' ||
    currentPassword.length === 0 ||
    typeof newPassword !== 'string' ||
    newPassword.length === 0
  ) {
    return json({ ok: false, reason: 'Current and new passwords are required.' }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return json(
      { ok: false, reason: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (currentPassword === newPassword) {
    return json(
      { ok: false, reason: 'Choose a new password that is different from your current password.' },
      { status: 400 }
    );
  }

  const {
    data: { user: verifiedUser },
    error: signInError
  } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (signInError || verifiedUser?.id !== user.id) {
    return json({ ok: false, reason: 'Current password is incorrect.' }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return json(
      { ok: false, reason: getAuthErrorMessage(error) },
      { status: getAuthErrorStatus(error) }
    );
  }

  return json({ ok: true });
};
