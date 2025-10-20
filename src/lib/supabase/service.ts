// src/lib/supabase/service.ts
import type { Database } from '$lib/types/supabase';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE } from '$env/static/private';

if (!PUBLIC_SUPABASE_URL) throw new Error('PUBLIC_SUPABASE_URL env var is required');
if (!SUPABASE_SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE env var is required');

const url = PUBLIC_SUPABASE_URL;
const serviceKey = SUPABASE_SERVICE_ROLE; // server-only secret

// Hot-reload safe singleton (dev)
let _client: SupabaseClient<Database> | undefined;
export const supabaseService =
  _client ??
  (_client = createClient<Database>(url, serviceKey, {
    global: { headers: { 'x-app-role': 'service' } }
  }));
