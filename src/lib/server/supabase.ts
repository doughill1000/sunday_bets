// src/lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE } from '$env/static/private';
import type { Database } from '$lib/types/supabase';

export const supabaseService = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
