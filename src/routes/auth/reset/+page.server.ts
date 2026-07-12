import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
// `redirect` stays in use for the recovery-token exchange in `load` below.

export const load: PageServerLoad = async ({ url, locals }) => {
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  // If a recovery token is present, exchange it for a session and redirect to
  // the clean URL. The session cookie is set before the redirect goes out.
  if (token_hash && type === 'recovery') {
    const { error } = await locals.supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash
    });

    if (error) {
      redirect(303, '/auth?reset=expired');
    }

    // Token consumed — redirect to clean URL so refresh doesn't re-attempt.
    redirect(303, '/auth/reset');
  }

  // No token: must already have a session (set by the redirect above).
  if (!locals.session) {
    redirect(303, '/auth');
  }

  return {};
};

const MIN_PASSWORD_LENGTH = 8;

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const { user } = locals;
    if (!user) return fail(401, { message: 'Not authenticated' });

    const form = await request.formData();
    const password = String(form.get('password') ?? '').trim();

    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(400, {
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      });
    }

    const { error } = await locals.supabase.auth.updateUser({ password });

    if (error) {
      return fail(400, { message: error.message ?? 'Could not update password' });
    }

    // Return success instead of redirecting silently so the page can show a durable
    // confirmation (audit S4). The recovery session is already active, so the
    // "Continue to picks" link on the confirmation lands the user in the app.
    return { success: true };
  }
};
