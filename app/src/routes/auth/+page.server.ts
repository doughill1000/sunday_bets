import type { Actions } from './$types';
import { fail, json } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') || '');
    const method = String(form.get('method') || 'magic');
    const password = String(form.get('password') || '');

    if (!email) return fail(400, { error: 'Email required' });

    if (method === 'password') {
      const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
      if (error) return fail(400, { error: error.message });
      return json({ redirect: '/picks' });
    }

    // Magic link
    const redirectTo = new URL('/auth/confirm', url).toString();
    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) return fail(400, { error: error.message });
    return json({ message: 'Check your email for the magic link.' });
  }
};