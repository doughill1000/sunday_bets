import { createClient } from '@supabase/supabase-js';

const serviceKey = process.env.SERVICE_ROLE_KEY;

console.log("serviceKey", serviceKey);

if (!serviceKey) {
  throw new Error('Supabase URL or Service Key is missing. Ensure your test environment is configured.');
}

/**
 * A Supabase client instance authenticated with the service_role key.
 * Use this for all integration test interactions with the database.
 */
export const supabase = createClient("http://127.0.0.1:54321", serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});