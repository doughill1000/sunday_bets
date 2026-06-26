// src/lib/supabase/service.ts
import type { Database } from '$lib/types/supabase';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

// The service-role secret is read from the *runtime* environment ($env/dynamic),
// not inlined at build time, and the client is created lazily on first use. The
// prebuilt deploy artifact is built in CI (GitHub Actions) where build-time
// secrets are intentionally absent — the service-role key is marked Sensitive in
// Vercel and only ever exists in the runtime. Reading at first use keeps the key
// out of the bundle and lets `vercel build` succeed without it. See ADR-0010.
let _client: SupabaseClient<Database> | undefined;

function getServiceClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE; // server-only secret
  if (!url) throw new Error('PUBLIC_SUPABASE_URL env var is required');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE env var is required');

  _client = createClient<Database>(url, serviceKey, {
    global: { headers: { 'x-app-role': 'service' } }
  });
  return _client;
}

// Preserve the `supabaseService.from(...)` call API used across the codebase
// while deferring client construction (and the secret read) to first use.
export const supabaseService: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getServiceClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
