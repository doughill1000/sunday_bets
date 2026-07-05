// Supabase client for the mobile app. Unlike the web app (cookie sessions via
// @supabase/ssr — see AGENTS.md "Auth & admin"), the mobile client keeps its session
// in AsyncStorage and talks to Supabase directly; RLS is the enforcement boundary
// for every read/write this client performs.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy mobile/.env.example to mobile/.env and fill in the values (see mobile/README.md).'
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth-callback URLs land in a native app's location bar.
    detectSessionInUrl: false
  }
});

// Refresh tokens only while the app is foregrounded (the Supabase-recommended
// React Native pattern); the web platform manages visibility itself.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/** Host shown on the Profile screen so it's obvious which environment you're on. */
export const supabaseHost = new URL(url).host;
