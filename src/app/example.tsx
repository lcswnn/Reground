/**
 * Screen 1, watched first: the sigh running on a loop, with nothing asked of
 * anybody.
 *
 * Reached from `breathe-intro.tsx` by the second button on it, and left by the
 * only button here, which goes straight back there. Nothing else happens on the
 * way in or out — no session state is touched, no progress is recorded, and the
 * breath does not begin. The whole screen is a demonstration.
 *
 * ## Why it is a screen and not a panel
 *
 * It was a disclosure inside the intro screen, and then a modal over it. Both
 * were the same mistake at different sizes. What is being shown is a breath: it
 * runs for half a minute, it is watched rather than read, and the circle wants
 * the room to be watched in. A panel is the shape for a paragraph.
 *
 * Being a screen also fixes the way out. A modal is dismissed and leaves you
 * where you were, which sounds like an advantage until you notice that "where
 * you were" is a screen you had already decided not to press Start on. This
 * comes back to that screen deliberately, with Start waiting, having answered
 * the question that stopped you.
 *
 * ## Why there is no Start on this screen
 *
 * It would save a tap and it would be the wrong tap. The intro screen is where
 * the session is agreed to — one screen, one decision, and everything on it
 * arranged around that button. A second Start here would make this a fork
 * rather than a look, and somebody who watched the loop twice would have to
 * decide twice.
 *
 * The back button goes to the same place the "Got it" button does; both are
 * `/breathe-intro`, and neither is a shortcut past it.
 */

import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SIGH_EXAMPLE } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { SighExample } from '@/session/breathing/sigh-example';
import { Rule } from '@/session/ui/rule';
import { SessionScreen } from '@/session/ui/session-screen';
import { useSessionBack } from '@/session/use-session-back';

export default function ExampleScreen() {
  const router = useRouter();
  /**
   * No session guard, for the reason `breathe-intro.tsx` gives: this sits ahead
   * of everything the session records, so there is no state it could be
   * missing.
   */
  const back = useSessionBack('/example');

  return (
    <SessionScreen onBack={back}>
      <View style={styles.root}>
        <View style={styles.heading}>
          <ThemedText type="title">{SIGH_EXAMPLE.title}</ThemedText>
          {/* The mark the app heads its screens with — see `Rule`, and the
              breath's intro, which this screen is a step off. */}
          <Rule />
        </View>

        {/* Takes the room between the heading and the button and centres the
            demonstration in it, the same shape the door and the intro use. */}
        <View style={styles.stage}>
          <SighExample />
        </View>

        <View style={styles.actions}>
          <Button
            title={SIGH_EXAMPLE.done}
            size="large"
            onPress={() => router.replace('/breathe-intro')}
          />
        </View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.three,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: Spacing.three,
  },
});
