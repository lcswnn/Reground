/**
 * Screen 3b — the optional reactivation cue, between the breath and the game.
 *
 * Bringing the image back is what gives the puzzle something to compete with,
 * so it makes the next screen work better. It is also the one moment in the
 * session that deliberately hurts, which is why it is skipped outright for
 * anyone already at the top of the scale.
 *
 * There is no Skip button any more — the screen is Ready or nothing. What is
 * left as a way out is the auto-skip and the back button, and the back button
 * records nothing, so `reactivationSkipped` no longer distinguishes "chose not
 * to" from "was never asked". If a deliberate opt-out comes back, it needs a
 * string and a `setReactivationSkipped(true)`, not just a button.
 *
 * It used to sit before the breath, immediately after the rating, and it was
 * moved here for two reasons. The cue and the puzzle are one mechanism — the
 * reminder is what the puzzle competes with — and a minute of breathing wedged
 * between them put the whole of the calming step in the gap. And asking someone
 * to bring the thing back is easier to do having just breathed than it is cold,
 * two screens after saying how bad they feel.
 *
 * There is no text input here and there never should be. Putting the thing
 * into words is a much heavier ask than holding it in mind, and it is not what
 * the mechanism needs.
 *
 * The reason it is being asked sits behind a tap. This screen is the one that
 * deliberately costs the user something, so it owes an answer to "why should
 * I" — but printing the rationale above the buttons would make reading it the
 * price of admission, and someone who just wants it over with has already paid
 * enough. The evidence half is hedged where the evidence is hedged; see the
 * notes on the copy in `@/content/strings`.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { REACTIVATION } from '@/content/strings';
import { Spacing } from '@/constants/theme';
import { Disclosure, DISCLOSURE_LAYOUT } from '@/session/ui/disclosure';
import { SessionScreen } from '@/session/ui/session-screen';
import { skipsReactivation } from '@/session/routing';
import { useSessionBack } from '@/session/use-session-back';
import { useSessionFlow } from '@/session/session-context';

export default function ReactivationScreen() {
  const router = useRouter();
  const { moodBefore, setReactivationSkipped } = useSessionFlow();
  const back = useSessionBack('/reactivate');

  const autoSkip = moodBefore !== null && skipsReactivation(moodBefore);

  useEffect(() => {
    if (moodBefore === null) {
      router.replace('/');
      return;
    }
    if (autoSkip) {
      // Recorded as skipped either way: what matters downstream is whether the
      // image was reactivated, not whose decision it was.
      setReactivationSkipped(true);
      router.replace('/games');
    }
  }, [autoSkip, moodBefore, router, setReactivationSkipped]);

  if (moodBefore === null || autoSkip) return null;

  /**
   * The only way forward from here now that the Skip button is gone.
   *
   * `setReactivationSkipped(false)` is still called explicitly rather than left
   * to the initial state: the flag is what tells anything downstream whether
   * the image was actually brought back, and reaching that conclusion by
   * nothing having overwritten a default is how it silently goes wrong.
   *
   * The screen still has two other exits — the auto-skip above, and the back
   * button, which leaves without recording anything because it is not an answer
   * to the question.
   */
  const ready = () => {
    setReactivationSkipped(false);
    router.replace('/games');
  };

  return (
    <SessionScreen centered onBack={back}>
      <View style={styles.root}>
        <View style={styles.ask}>
          <ThemedText type="subtitle">{REACTIVATION.body}</ThemedText>

          <Disclosure label={REACTIVATION.explainLabel}>
            <ThemedText themeColor="textSecondary">{REACTIVATION.why}</ThemedText>
            <ThemedText themeColor="textSecondary">{REACTIVATION.whyEvidence}</ThemedText>
          </Disclosure>
        </View>

        {/* Slides rather than jumping when the explanation opens above it — a
            layout animation only moves the view it is on. */}
        <Animated.View layout={DISCLOSURE_LAYOUT} style={styles.actions}>
          <Button title={REACTIVATION.ready} onPress={ready} />
        </Animated.View>
      </View>
    </SessionScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.six,
  },
  ask: {
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
});
