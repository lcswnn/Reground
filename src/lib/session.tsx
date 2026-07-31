import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { getScopeUser, setScopeUser } from '@/lib/user-scope';

interface SessionContextValue {
  session: Session | null;
  /** True until we know whether a persisted session exists. Gate the UI on this. */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** `birthDate` is `YYYY-MM-DD`; it seeds profiles.birth_date via the trigger. */
  signUp: (
    email: string,
    password: string,
    displayName: string,
    birthDate: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return value;
}

/**
 * Points every per-user cache at the account that just arrived.
 *
 * Called from the auth callbacks rather than an effect, so the switch happens in
 * the same tick the session does and before React re-renders — a screen never
 * gets a frame showing the previous reader's numbers.
 *
 * Two things move together, and both are needed:
 *
 *   - **The device stores.** `setScopeUser` re-namespaces `localStorage`, so the
 *     weighting, the day count and today's vote follow the account rather than
 *     the phone. Without it, signing in as somebody else inherited all three —
 *     and the weighting was then uploaded into *their* profile by the sync.
 *   - **The query cache.** Saved stories and the profile are per-user and come
 *     from the server, but a cache is a cache: clearing only on `signOut` left
 *     the previous account's rows readable whenever a session ended some other
 *     way — an expired refresh token, a password change, the app being killed
 *     mid-sign-out.
 *
 * Guarded on an actual change of account. `onAuthStateChange` also fires on
 * every token refresh, and clearing the cache hourly would turn a warm app cold
 * for no reason.
 */
function adoptSession(next: Session | null): void {
  const nextUserId = next?.user.id ?? null;
  if (nextUserId === getScopeUser()) return;

  queryClient.clear();
  setScopeUser(nextUserId);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      adoptSession(data.session);
      setSession(data.session);
      setIsLoading(false);
    });

    // Fires for sign-in, sign-out, and every token refresh, so this is the single
    // source of truth once the initial read has resolved.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      adoptSession(next);
      setSession(next);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      async signUp(email, password, displayName, birthDate) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // Read by the handle_new_user() trigger to seed the profiles row.
          options: { data: { display_name: displayName.trim(), birth_date: birthDate } },
        });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        // `adoptSession` clears the cache and re-scopes the device stores when
        // the auth handler fires. Kept here as well because that fires
        // asynchronously, and this closes the window where a screen still
        // mounted could re-read the outgoing account's rows.
        queryClient.clear();
      },
    }),
    [session, isLoading],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
