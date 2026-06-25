import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  google: async ({ locals, url }) => {
    // Forward a `next` param into the callback so post-auth redirects survive
    // the OAuth round-trip (e.g. /join/[code] → Google → /auth/callback?next=…
    // → /join/[code]).
    const next = url.searchParams.get('next');
    const callbackUrl = next
      ? `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${url.origin}/auth/callback`;

    const { data, error } = await locals.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl }
    });

    if (error || !data.url) {
      return fail(400, { ok: false, message: error?.message ?? 'OAuth error' });
    }

    throw redirect(303, data.url);
  },

  signin: async ({ request, locals, url }) => {
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
      // Honor a `next` param so post-auth redirects (e.g. /join/[code]) land
      // the user in the right place after sign-in. Guard against open redirects.
      const next = url.searchParams.get('next') ?? '/picks';
      const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/picks';
      throw redirect(303, safePath);
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
