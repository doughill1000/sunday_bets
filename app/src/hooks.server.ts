// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { createSSRClient, safeGetSession } from '$lib/supabase/ssr';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSSRClient(event);
  event.locals.safeGetSession = () => safeGetSession({ locals: event.locals });

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version'
  });
};
