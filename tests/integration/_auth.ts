import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/supabase';

type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

// super tiny in-memory storage (per client) so instances never collide
function makeMemoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    }
  };
}

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE ?? '';

export function signTestJwt(
  userId: string,
  {
    role = 'authenticated',
    ttlSeconds = 600
  }: { role?: 'authenticated' | 'service_role' | 'anon'; ttlSeconds?: number } = {}
) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      // minimal set of useful claims
      sub: userId,
      role,
      iss: 'supabase',
      aud: 'authenticated',
      iat: now,
      exp: now + ttlSeconds
    },
    JWT_SECRET
  );
}

// Create a client that acts *as the given user*
export function createUserClient(userId: string) {
  const token = signTestJwt(userId);
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `sb-admin-test-${process.pid}-${Math.random().toString(36).slice(2)}`
    },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// Keep your service client for seeding/admin ops
export function createServiceClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `sb-admin-test-${process.pid}-${Math.random().toString(36).slice(2)}`
    }
  });
}
