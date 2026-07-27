import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
  auth: {
    // `expo-sqlite/localStorage/install` polyfills a synchronous localStorage
    // backed by SQLite, which is what the SDK 57 Supabase guide recommends.
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There is no URL to read a session out of in a native app; leaving this on
    // makes the client try to parse deep links as auth callbacks.
    detectSessionInUrl: false,
  },
});

// Supabase refreshes the access token on a timer. That timer does not survive
// the app being backgrounded, so we stop it on background and restart it on
// foreground — otherwise the first request after a long background hits a
// silently expired token.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
