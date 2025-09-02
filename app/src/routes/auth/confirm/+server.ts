import type { RequestHandler } from './$types';

// Completes the OTP (magic link) flow and sets auth cookies
export const GET: RequestHandler = async ({ locals, url }) => {
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as 'magiclink' | 'recovery' | 'signup' | null;
  const next = '/picks';

  if (!token_hash || !type) {
    return new Response('Missing token', { status: 400 });
  }

  const { error } = await locals.supabase.auth.verifyOtp({ type, token_hash });
  if (error) return new Response(`Auth error: ${error.message}`, { status: 400 });

  return new Response(null, { status: 303, headers: { location: next } });
};