// src/app.d.ts
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
      user: User | null;
      // matches your helper’s signature; adjust if it returns more
      safeGetSession: () => Promise<{ session: Session | null }>;
    }
  }
}

export {};
