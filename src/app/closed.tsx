/**
 * Screen 9 — the dead end, and the only screen in the app with nothing on it.
 *
 * The session used to loop: "Close" reset the state and dropped the user back
 * on the opening question, which is an invitation to start again. That is the
 * one thing this app should never do. It exists to be finished and left, so the
 * last screen has no button, no link and nowhere to go.
 *
 * Small, muted and italic — as close to a stage direction as type gets. It is
 * not addressing the user so much as getting out of their way.
 *
 * The session state was already cleared on the way in, so nothing entered is
 * still in memory behind this.
 *
 * The one screen that keeps its wall now that every other screen has a back
 * button. Going back would mean re-entering a session that no longer exists —
 * and a dead end with a way out of it is not a dead end. See `previousRoute`.
 */

import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { CLOSED } from '@/content/strings';
import { SessionScreen } from '@/session/ui/session-screen';

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
      <View style={styles.root}>
        <ThemedText type="small" themeColor="textMuted" style={styles.line}>
          {CLOSED.line}
        </ThemedText>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  line: {
    textAlign: 'center',
    // Playpen Sans ships no italic cut (the family is a weight axis only), so
    // this is honoured on Android and web, which synthesise an oblique, and
    // quietly ignored on iOS, which does not. The skew below is what makes it
    // actually lean there — a real slant on the real face, rather than dropping
    // the line to a system italic that would look like it came from another
    // app.
    fontStyle: 'italic',
    ...Platform.select({ ios: { transform: [{ skewX: '-9deg' }] } }),
  },
});
