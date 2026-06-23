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
      userProfile: { displayName: string; avatarKey: string | null } | null;
    }
  }
}

export {};
