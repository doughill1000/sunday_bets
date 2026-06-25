import * as Sentry from '@sentry/sveltekit';
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
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
  event.locals.userProfile = null;
  event.locals.groupId = null;
  if (user) {
    const [profileResult, membershipResult] = await Promise.all([
      supabaseService
        .from('users')
        .select('role, display_name, avatar_key, guide_seen_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseService
        .from('group_memberships')
        .select('group_id, status')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
    ]);

    event.locals.isAdmin = profileResult.data?.role === 'admin';
    if (profileResult.data) {
      event.locals.userProfile = {
        displayName: profileResult.data.display_name ?? '',
        avatarKey: profileResult.data.avatar_key ?? null,
        guideSeenAt: profileResult.data.guide_seen_at ?? null
      };
    }

    const membership = membershipResult.data;
    const isExemptPath =
      event.url.pathname.startsWith('/auth') ||
      event.url.pathname.startsWith('/api') ||
      event.url.pathname.startsWith('/join');

    if (!isExemptPath) {
      if (!membership) {
        throw redirect(303, '/join');
      }
      if (membership.status === 'pending') {
        throw redirect(303, '/join/pending');
      }
    }

    event.locals.groupId = membership?.status === 'active' ? membership.group_id : null;
  }

  return resolve(event);
};

export const handle: Handle = sequence(Sentry.sentryHandle(), sequence(supabase, injectSession));
export const handleError = Sentry.handleErrorWithSentry();
