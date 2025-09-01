// src/lib/supabase/ssr.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import type { Database } from '$lib/server/db';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createSSRClient(event: Pick<RequestEvent, 'cookies'>) {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) =>
          event.cookies.set(name, value, { path: '/', ...(options as CookieOptions) })
        );
      }
    }
  });
}

/** Optional helper that mirrors your existing safeGetSession */
export async function safeGetSession(event: {
  locals: { supabase: ReturnType<typeof createSSRClient> };
}) {
  const {
    data: { session }
  } = await event.locals.supabase.auth.getSession();
  const {
    data: { user }
  } = await event.locals.supabase.auth.getUser();
  return { session, user };
}
