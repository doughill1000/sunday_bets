import type { RequestHandler } from './$types';

// Completes the OAuth (PKCE) flow and sets auth cookies.
// Supports a `next` query param for post-auth redirects (e.g. after linkIdentity).
// Guards against open redirects: only relative paths starting with / are accepted.
export const GET: RequestHandler = async ({ locals, url }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) return new Response(`Auth error: ${error.message}`, { status: 400 });

  const next = url.searchParams.get('next') ?? '/picks';
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/picks';
  return new Response(null, { status: 303, headers: { location: safePath } });
};
