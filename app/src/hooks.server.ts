// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { createSSRClient, safeGetSession } from '$lib/supabase/ssr';

export const handle: Handle = async ({ event, resolve }) => {
  // 1) Create an RLS-aware Supabase client bound to this request's cookies.
  const supabase = createSSRClient(event);

  // 2) Make it available everywhere on the server.
  event.locals.supabase = supabase;

  // 3) Expose your helper so routes can call it too (optional).
  event.locals.safeGetSession = () => safeGetSession({ locals: event.locals });

  // 4) Eagerly fetch session once so locals.user is ready for all loads/API routes.
  const { session } = await event.locals.safeGetSession();
  event.locals.session = session ?? null;
  event.locals.user = session?.user ?? null;

  return resolve(event, {
    // keep auth-helper headers flowing through SSR responses
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version'
  });
};
