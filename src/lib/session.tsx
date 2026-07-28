import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

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

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    // Fires for sign-in, sign-out, and every token refresh, so this is the single
    // source of truth once the initial read has resolved.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
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
        // Saved stories and streaks are per-user. Without this the next account
        // to sign in on this device would briefly see the previous one's data.
        queryClient.clear();
      },
    }),
    [session, isLoading],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
