import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
console.log('SUPABASE_URL:', supabaseUrl);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Supabase URL or Service Key is missing. Ensure your test environment is configured.');
}

/**
 * A Supabase client instance authenticated with the service_role key.
 * Use this for all integration test interactions with the database.
 */
export const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});