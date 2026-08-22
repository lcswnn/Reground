/**
 * The Supabase client, back in the app — and the second thing that crosses the
 * network boundary, after the humanity artifact.
 *
 * `app/_layout.tsx` used to say there was exactly one network call and that a
 * second one appearing "is the thing worth arguing about". This is that second
 * one, so here is the argument: the app has no way of knowing whether it works.
 * `moodBefore` and `moodAfter` are the only honest measure of that and they have
 * been thrown away at the end of every session since the pivot — the note at the
 * top of `session-context.tsx` says as much, and calls the pairing the thing
 * that would be worth keeping. This is that, plus somewhere for a purchase to be
 * recorded, and nothing else.
 *
 * Everything about how it is wired follows from that being a small ask:
 *
 *  - **Nothing here is on the session's critical path.** The client is built
 *    lazily on first use, every call is fire-and-forget, and every failure is
 *    swallowed. A dropped connection, a rate limit, an unrun migration and a
 *    project that has been deleted all look the same from a screen: nothing.
 *  - **`null` rather than a throw when the env is unset.** Same rule
 *    `api/humanity.ts` follows — the keys are inlined at bundle time, so an
 *    unset one is a build that shipped wrong, and taking the whole session down
 *    over it would be the wrong trade twice over.
 *
 * ## The key in here is not a secret
 *
 * `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ships inside the bundle and always has
 * — see the comment in `.env`. Row Level Security is what protects the data, and
 * the policies in `supabase/migrations/0001_app_analytics.sql` are written so
 * that an install can only ever see its own rows.
 *
 * ## Where the auth token is kept
 *
 * In `localStorage`, which is `expo-sqlite`'s synchronous shim — the same store
 * the three preference files use, already installed, no new native module and
 * no rebuild.
 *
 * Supabase's own Expo guide reaches for `expo-secure-store` (wrapped, because it
 * caps values at 2 KB and a JWT is bigger). That is the right call for a token
 * that stands for a person. This one stands for a random number with some mood
 * ratings attached and no way to reach anything else, and buying it a native
 * dependency plus an encryption dance is paying a real cost against a threat
 * model of "somebody has already rooted the phone". If this id ever gates a
 * purchase — see the warning on `app_purchases` — revisit that sentence.
 */

import 'expo-sqlite/localStorage/install';

import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { ANALYTICS_ENABLED } from '@/lib/analytics/enabled';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * `undefined` is "not built yet", `null` is "cannot be built". The second is
 * cached as hard as the first: a missing env var will not appear halfway
 * through a launch, and retrying the check on every write would be pointless.
 */
let cached: SupabaseClient | null | undefined;

/**
 * Adapted rather than passed straight through. `localStorage` is unavailable in
 * some web contexts, and an auth client whose storage throws mid-refresh is a
 * worse failure than one that quietly behaves as though it has never been
 * signed in.
 */
const storage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // See above: a token that cannot be written is an install that gets a new
      // id next launch, which costs one row and nothing else.
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing useful to do, and nowhere to say it.
    }
  },
};

export function supabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  // The master switch, and the missing-keys case, which are the same outcome by
  // design — see `enabled.ts`. Everything downstream already treats a null
  // client as "record nothing", so this is the whole of the off state.
  if (!ANALYTICS_ENABLED || !URL || !KEY) {
    cached = null;
    return cached;
  }

  cached = createClient(URL, KEY, {
    auth: {
      storage,
      // The id has to survive a relaunch or it is not an install id.
      persistSession: true,
      autoRefreshToken: true,
      // There is no URL to detect a session in. Left on, this listens for a
      // browser redirect that will never happen.
      detectSessionInUrl: false,
    },
  });

  /**
   * Token refresh runs on a timer, and a timer in a backgrounded React Native
   * app fires late, all at once, or not at all — Supabase's guidance for this
   * platform is to stop the loop when the app is not in the foreground and let
   * the client catch up on the way back. Registered once, here, because the
   * client is a singleton and so is `AppState`.
   */
  AppState.addEventListener('change', (state) => {
    if (!cached) return;

    if (state === 'active') void cached.auth.startAutoRefresh();
    else void cached.auth.stopAutoRefresh();
  });

  return cached;
}

/** Whether the app was built with somewhere to send any of this. */
export function hasBackend(): boolean {
  return Boolean(URL && KEY);
}
