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
      /** Per-request memoized season-year promise; null for unauthenticated requests. */
      currentSeasonYear: Promise<number> | null;
    }
  }
}

export {};
