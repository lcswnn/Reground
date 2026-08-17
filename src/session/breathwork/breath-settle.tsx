/**
 * The few seconds after the pattern, which are part of the pattern.
 *
 * Not a confirmation screen and not a well-done. It exists because of the one
 * thing people reliably get wrong about paced breathing: they treat it as a way
 * they are now supposed to breathe, and spend the next ten minutes monitoring a
 * breath that was fine before they started. A paced breath is a thing you do for
 * a minute and then hand back. So the instruction here is to stop counting, and
 * the only thing to notice is where the breath goes when nothing is steering it.
 *
 * Which is also why the clock finishing and "That's enough" both land here.
 * Somebody who stopped early because a hold started to feel wrong is the person
 * who most needs to be told to breathe normally for a moment — see
 * `use-breath-flow.ts`.
 *
 * `settleBody` accepts "nothing changed" as a real answer, for the reason
 * `somatic-settle.tsx` sets out at length: this app has already told this user
 * out loud that a thing not working is not something they got wrong, and it does
 * not get to imply otherwise two taps later. Nothing is recorded and there is no
 * check-in behind it.
 *
 * ## Three ways out
 *
 * Done with the session, another round of the same pattern, or a different
 * pattern. Weighted so the primary is the one that ends the session — someone
 * who has just been told to stop counting should not have to hunt for the door.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { BREATHWORK_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';

interface BreathSettleProps {
  /** Out of the session. */
  onDone: () => void;
  /** The same pattern again, from the top. */
  onAgain: () => void;
  /** Back to the four. */
  onAnother: () => void;
}

export function BreathSettle({ onDone, onAgain, onAnother }: BreathSettleProps) {
  return (
    <Animated.View entering={FadeIn.duration(GROUNDING_FADE.inMs)} style={styles.root}>
      <View style={styles.heading}>
        <ThemedText type="title">{BREATHWORK_COPY.settleTitle}</ThemedText>
        <ThemedText themeColor="textSecondary">{BREATHWORK_COPY.settleBody}</ThemedText>
      </View>

      <View style={styles.actions}>
        <Button title={BREATHWORK_COPY.settleDone} onPress={onDone} />
        <Button
          title={BREATHWORK_COPY.settleAgain}
          variant="secondary"
          onPress={onAgain}
        />
        <Button title={BREATHWORK_COPY.another} variant="ghost" onPress={onAnother} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  heading: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
});
