/// <reference types="vite-plugin-pwa/client" />

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/supabase'; // import generated types
import type { ThemeMode } from '$lib/theme';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
      session: Session | null;
      user: User | null;
      isAdmin: boolean;
      userProfile: {
        displayName: string;
        avatarKey: string | null;
        guideSeenAt: string | null;
        /** Per-user toggle for the pick-card ATS trend nugget (issue #406). Default true. */
        showTeamTrends: boolean;
        /** Per-user theme preference (issue #532): 'dark' | 'light' | 'system'.
         *  Defaults to dark when the column is unset/invalid (DEFAULT_THEME_MODE). */
        themePref: ThemeMode;
      } | null;
      groupId: string | null;
      /** All active group memberships for the authenticated user (empty for guests). */
      memberships: Array<{ groupId: string; groupName: string; role: string }>;
      /**
       * Per-request memoized accessor for the current season year. The first call
       * fires the DB round-trip; later callers (layout + page loads) share the same
       * Promise. Lazy, so requests that never need it (API routes, form actions)
       * pay nothing and leave no unconsumed promise to reject.
       */
      getCurrentSeasonYear: () => Promise<number>;
    }
  }

  /** Per-deploy build id injected by Vite `define` (vite.config.ts). Used as the
   * TanStack Query persister cache-buster — see ADR-0017. */
  const __BUILD_ID__: string;

  /** Sentry environment injected by Vite `define` (vite.config.ts) from VERCEL_ENV.
   * Sets `environment` in the client Sentry.init (src/hooks.client.ts). */
  const __SENTRY_ENV__: string;

  /** Show Beta tag in header injected by Vite `define` (vite.config.ts).
   * Gated on SHOW_BETA_TAG env var; defaults to true. Flips off at public launch. */
  const __SHOW_BETA_TAG__: boolean;
}

export {};
