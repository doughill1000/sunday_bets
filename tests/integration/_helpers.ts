import type { Database } from '$lib/types/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * A Supabase client instance authenticated with the service_role key.
 * Use this for all integration test interactions with the database.
 */
export const createSupaClient = () =>
  createClient<Database>(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
