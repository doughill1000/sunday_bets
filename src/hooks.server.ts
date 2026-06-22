import * as Sentry from '@sentry/sveltekit';
import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { supabaseService } from '$lib/supabase/service';
import type { Database } from '$lib/types/supabase';

const supabase: Handle = async ({ event, resolve }) => {
  /**
   * Creates a Supabase client specific to this server request.
   *
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        /**
         * SvelteKit's cookies API requires `path` to be explicitly set in
         * the cookie options. Setting `path` to `/` replicates previous/
         * standard behavior.
         */
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // SvelteKit defaults `secure` to true for every host except
            // `localhost`. Over plain-HTTP LAN access (e.g. http://192.168.x.x
            // for mobile testing) the browser then rejects the auth cookies and
            // the session is lost on the next request. Tie `secure` to the
            // actual protocol so HTTP LAN dev works and production HTTPS stays
            // secure.
            event.cookies.set(name, value, {
              ...options,
              path: '/',
              secure: event.url.protocol === 'https:'
            });
          });
        }
      }
    }
  );

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();
    if (!session) {
      return { session: null, user: null };
    }

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();
    if (error) {
      // JWT validation has failed
      return { session: null, user: null };
    }

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};

const injectSession: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  // The `users.role` column is the single source of truth for admin access
  // (same source the is_admin() SQL function uses for RLS).
  event.locals.isAdmin = false;
  if (user) {
    const { data } = await supabaseService
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    event.locals.isAdmin = data?.role === 'admin';
  }

  return resolve(event);
};

export const handle: Handle = sequence(Sentry.sentryHandle(), sequence(supabase, injectSession));
export const handleError = Sentry.handleErrorWithSentry();
