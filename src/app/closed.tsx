/**
 * Screen 9 — the dead end, and the only screen in the app with nothing on it.
 *
 * The session used to loop: "Close" reset the state and dropped the user back
 * on the opening question, which is an invitation to start again. That is the
 * one thing this app should never do. It exists to be finished and left, so the
 * last screen has no button, no link and nowhere to go.
 *
 * Small, muted and italic — as close to a stage direction as type gets. It is
 * not addressing the user so much as getting out of their way. `index.tsx` now
 * opens on the same treatment, so the session is bookended by two lines in the
 * same voice; the styling lives in `StageDirection` so they cannot drift.
 *
 * The session state was already cleared on the way in, so nothing entered is
 * still in memory behind this.
 *
 * The one screen that keeps its wall now that every other screen has a back
 * button. Going back would mean re-entering a session that no longer exists —
 * and a dead end with a way out of it is not a dead end. See `previousRoute`.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';

import { CLOSED } from '@/content/strings';
import { SessionScreen } from '@/session/ui/session-screen';
import { StageDirection } from '@/session/ui/stage-direction';

export default function ClosedScreen() {
  const router = useRouter();

  /**
   * The one way off this screen, and it is not a tap.
   *
   * A route with no exit is a dead end for the session, which is the point —
   * but it would also be a dead end for the *app*, because iOS keeps a
   * backgrounded app in memory with its route intact. Someone who opens
   * Reground again next week, on a process that never died, would land straight
   * back here and find a wall.
   *
   * So: leaving and coming back is what starts a new session. `change` only
   * fires on a transition, so arriving here does nothing — the app has to have
   * actually gone away first. Remove this and the screen is permanent until the
   * OS kills the process.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') router.replace('/');
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <SessionScreen centered>
      <StageDirection>{CLOSED.line}</StageDirection>
    </SessionScreen>
  );
}
