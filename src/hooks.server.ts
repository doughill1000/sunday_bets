import * as Sentry from '@sentry/sveltekit';
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { supabaseService } from '$lib/supabase/service';
import type { Database } from '$lib/types/supabase';
import { ACTIVE_GROUP_COOKIE, resolveActiveGroupId } from '$lib/server/group-resolver';
import { getAuthContext } from '$lib/server/auth-context-cache';
import { getCurrentSeasonYear } from '$lib/server/db/queries/leaderboard';
import { traceDbQuery, traceSpan } from '$lib/server/observability';

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
   *
   * Memoized per request: the first call fires the getUser() network round-trip;
   * subsequent calls (e.g. from the root layout load) return the same Promise,
   * so getUser() is never called more than once per request.
   */
  let _sessionCache: ReturnType<(typeof event.locals)['safeGetSession']> | null = null;
  event.locals.safeGetSession = () =>
    (_sessionCache ??= (async () => {
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
    })());

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
  event.locals.memberships = [];
  // Lazily memoize the season-year lookup: the first consumer (layout or a page
  // load) fires one DB round-trip and every later caller shares it. Unlike an eager
  // kick-off, requests that never read it (API routes, form actions) pay nothing and
  // leave no unconsumed promise to reject.
  let _seasonYear: Promise<number> | null = null;
  event.locals.getCurrentSeasonYear = () => (_seasonYear ??= getCurrentSeasonYear());

  if (user) {
    // Per-request auth-hook DB cost: a parent span over the two service-role
    // reads, each wrapped as a child DB span so the cost is readable in Sentry
    // per query and in aggregate (issue #190).
    //
    // The traced fetch is the cache MISS path: `getAuthContext` serves a warm
    // entry within the ~30s TTL without running it, so a hit emits none of the
    // #190 DB spans and the cache hit rate reads straight off Sentry (ADR-0014).
    // The cache is a latency optimization only — `isAdmin` derived below is a UI
    // hint; admin endpoints re-verify `users.role` fresh in `requireAdmin`.
    const { profile: profileResult, memberships: membershipsResult } = await getAuthContext(
      user.id,
      () =>
        traceSpan('auth-hook.db', 'function.sveltekit.hook', async () => {
          const [profile, memberships] = await Promise.all([
            traceDbQuery('auth-hook.users-profile', () =>
              supabaseService
                .from('users')
                .select('role, display_name, avatar_key, guide_seen_at, show_team_trends')
                .eq('id', user.id)
                .maybeSingle()
            ),
            traceDbQuery('auth-hook.group-memberships', () =>
              supabaseService
                .from('group_memberships')
                .select('group_id, status, role, groups(name)')
                .eq('user_id', user.id)
            )
          ]);
          return { profile, memberships };
        })
    );

    event.locals.isAdmin = profileResult.data?.role === 'admin';
    if (profileResult.data) {
      event.locals.userProfile = {
        displayName: profileResult.data.display_name ?? '',
        avatarKey: profileResult.data.avatar_key ?? null,
        guideSeenAt: profileResult.data.guide_seen_at ?? null,
        showTeamTrends: profileResult.data.show_team_trends ?? true
      };
    }

    const allMemberships = membershipsResult.data ?? [];
    const activeMemberships = allMemberships.filter((m) => m.status === 'active');

    // Build the typed memberships list for the switcher UI.
    event.locals.memberships = activeMemberships.map((m) => ({
      groupId: m.group_id,
      groupName: (m.groups as { name: string } | null)?.name ?? m.group_id,
      role: m.role
    }));

    const isExemptPath =
      event.url.pathname.startsWith('/auth') ||
      event.url.pathname.startsWith('/api') ||
      event.url.pathname.startsWith('/join');

    // Check for pending-only memberships (no active ones).
    const pendingMembership = allMemberships.find((m) => m.status === 'pending');

    if (!isExemptPath) {
      if (allMemberships.length === 0) {
        throw redirect(303, '/join');
      }
      if (activeMemberships.length === 0 && pendingMembership) {
        throw redirect(303, '/join/pending');
      }
    }

    // Resolve the active group from the cookie, falling back to the first
    // active membership if the cookie value is absent or no longer valid.
    const cookieGroupId = event.cookies.get(ACTIVE_GROUP_COOKIE) ?? null;
    event.locals.groupId = resolveActiveGroupId(
      cookieGroupId,
      activeMemberships.map((m) => m.group_id)
    );
  }

  return resolve(event);
};

export const handle: Handle = sequence(Sentry.sentryHandle(), sequence(supabase, injectSession));
export const handleError = Sentry.handleErrorWithSentry();
