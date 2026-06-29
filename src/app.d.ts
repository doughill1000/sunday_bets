/// <reference types="vite-plugin-pwa/client" />

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/supabase'; // import generated types

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
}

export {};
