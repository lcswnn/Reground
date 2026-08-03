import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { getScopeUser, setScopeUser } from '@/lib/user-scope';

/**
 * Who the reader is, without ever asking.
 *
 * There are no sign-in or sign-up screens. The app opens on Today, and the
 * identity underneath it is a Supabase *anonymous* user created silently on
 * first launch and persisted from then on.
 *
 * That is a deliberate trade, and worth stating plainly because it is invisible
 * from the UI:
 *
 *   - **What it buys.** Everything per-reader still works — saved stories, card
 *     reactions, the birthday behind "Since you were born", the weighting synced
 *     off the device — because RLS still sees a real `auth.uid()`. Nothing in
 *     `api/` had to learn about a signed-out mode, and no policy changed.
 *   - **What it costs.** The account is the install. There is no password to
 *     recover it with, so deleting the app, or wiping its storage, is the end of
 *     that reader's history, and a second device is a second reader. For an app
 *     whose state is a day count and a handful of bookmarks, that is the right
 *     side of the trade — but it is why `signOut` does not exist here. Signing
 *     out of an anonymous account is indistinguishable from deleting it, so the
 *     app does not offer a button that quietly destroys everything.
 *
 * Requires Anonymous Sign-Ins to be enabled for the Supabase project. With it
 * off, `signInAnonymously` fails with `anonymous_provider_disabled`; see
 * `startAnonymousSession` for what the app does then.
 */
interface SessionContextValue {
  session: Session | null;
  /** True until we know whether a session exists, including the first sign-in. */
  isLoading: boolean;
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
 *     the phone.
 *   - **The query cache.** Saved stories and the profile are per-user and come
 *     from the server, and a cache is a cache.
 *
 * With anonymous sessions the account rarely changes after the first launch —
 * but "rarely" is not "never": a lost refresh token means the next launch mints
 * a fresh anonymous user, and that reader must not open onto the previous one's
 * cached rows.
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

/**
 * Creates the anonymous user, once.
 *
 * Module scope rather than inside the effect because in development the provider
 * mounts twice, and two overlapping `signInAnonymously` calls create two
 * accounts — the second winning, the first left orphaned in `auth.users` with
 * whatever the reader had already done attached to it. Sharing the in-flight
 * promise makes the second caller await the first.
 *
 * A failure here is not fatal and deliberately does not throw. Today, Progress
 * and the daily card all read `humanity.json`, a public object in Storage that
 * needs no session at all — so a reader who is offline at first launch, or whose
 * project has anonymous sign-ins switched off, still gets the app. They lose the
 * per-user half of it (saved stories, reactions, birthday) until a launch where
 * this succeeds.
 */
let pending: Promise<Session | null> | null = null;

function startAnonymousSession(): Promise<Session | null> {
  pending ??= supabase.auth
    .signInAnonymously()
    .then(({ data, error }) => {
      if (error) {
        // Logged rather than swallowed: this is the one failure that quietly
        // halves the app, and it is otherwise invisible from the UI.
        console.warn('[session] anonymous sign-in failed:', error.message);
        return null;
      }
      return data.session;
    })
    .catch((error: unknown) => {
      console.warn('[session] anonymous sign-in failed:', error);
      return null;
    })
    .finally(() => {
      // Cleared so a later mount can retry — one attempt that failed offline
      // should not poison the process for as long as it runs.
      pending = null;
    });

  return pending;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();

      // Restored from storage on every launch after the first, and no network
      // call is made on that path.
      const current = data.session ?? (await startAnonymousSession());

      if (!active) return;
      adoptSession(current);
      setSession(current);
      setIsLoading(false);
    })();

    // Fires for the anonymous sign-in and every token refresh, so this is the
    // single source of truth once the initial read has resolved.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      adoptSession(next);
      setSession(next);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(() => ({ session, isLoading }), [session, isLoading]);

  return <SessionContext value={value}>{children}</SessionContext>;
}
