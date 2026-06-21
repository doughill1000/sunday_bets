import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();

    if (!email) {
      return fail(400, { ok: false, message: 'Email is required' });
    }

    // Password sign-in if password provided
    if (password) {
      const { data, error } = await locals.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return fail(400, { ok: false, message: error.message ?? 'Sign-in failed' });
      }

      // Successful password sign-in should create a session; redirect to app
      if (data?.session) {
        throw redirect(303, '/');
      }

      // Fallback - return a minimal serializable object
      return { ok: true, message: 'Signed in (no session returned)' };
    }

    // No password -> magic link (OTP). Send the user back to whichever origin
    // they requested the link from (prod, or a dynamic Vercel preview URL).
    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${url.origin}/auth/confirm` }
    });

    if (error) {
      return fail(400, { ok: false, message: error.message ?? 'Sign-in failed' });
    }

    return { ok: true, message: 'Check your email for a sign-in link' };
  }
};
