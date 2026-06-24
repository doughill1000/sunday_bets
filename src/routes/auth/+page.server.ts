import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  google: async ({ locals, url }) => {
    const { data, error } = await locals.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${url.origin}/auth/callback` }
    });

    if (error || !data.url) {
      return fail(400, { ok: false, message: error?.message ?? 'OAuth error' });
    }

    throw redirect(303, data.url);
  },

  signin: async ({ request, locals }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();

    if (!email) {
      return fail(400, { ok: false, message: 'Email is required' });
    }
    if (!password) {
      return fail(400, { ok: false, message: 'Password is required' });
    }

    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { ok: false, message: error.message ?? 'Sign-in failed' });
    }

    if (data?.session) {
      throw redirect(303, '/picks');
    }

    return { ok: true, message: 'Signed in (no session returned)' };
  },

  signup: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();

    if (!email) return fail(400, { ok: false, message: 'Email is required' });
    if (password.length < 8) {
      return fail(400, { ok: false, message: 'Password must be at least 8 characters' });
    }

    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${url.origin}/auth/confirm` }
    });

    if (error) {
      return fail(400, { ok: false, message: error.message ?? 'Sign-up failed' });
    }

    return { ok: true, message: 'Check your email for a confirmation link' };
  },

  resetRequest: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();

    if (!email) return fail(400, { ok: false, message: 'Email is required' });

    // Intentionally ignore errors to avoid leaking whether an account exists.
    await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${url.origin}/auth/reset`
    });

    return {
      ok: true,
      message: 'If an account exists for that email, a reset link has been sent'
    };
  }
};
