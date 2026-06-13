import type { RequestHandler } from './$types';

// Signs the user out and clears auth cookies
export const GET: RequestHandler = async ({ locals }) => {
  await locals.supabase.auth.signOut();

  return new Response(null, { status: 303, headers: { location: '/auth' } });
};
