import { createClient } from '@supabase/supabase-js';


 function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const rawKey = process.env.SERVICE_ROLE_KEY || '';
const serviceKey = stripTrailingSlash(rawKey);

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