/**
 * The few seconds after the movement, which are part of the movement.
 *
 * Not a confirmation screen and not a well-done. Every source on somatic work
 * says the same thing about how one of these should finish — end on the settled
 * thing, not on whatever got stirred up — and the instruction that goes with it
 * is to stop and notice what shifted. A movement that ends by dumping the user
 * straight back onto a menu has skipped the last step of itself.
 *
 * Which is why the clock running out and the user tapping "That's enough" both
 * land here. Somebody who stopped early because it started to feel wrong is the
 * person who most needs a beat before a decision — see `use-somatic-flow.ts`.
 *
 * ## The body has to accept "nothing"
 *
 * `settleBody` is written so that no change is a real answer rather than a
 * wrong one, and that is the one line here worth arguing over. A closing
 * question that only accepts an improvement teaches people to lie to it, and it
 * would contradict the app in its own voice: `CHECK_IN.didNotResponse` already
 * tells this user, out loud, that a thing not working is not something they got
 * wrong. This screen does not get to imply otherwise two taps later.
 *
 * Nothing is recorded. There is no scale, no buttons to answer with, and no
 * check-in behind it — the noticing is the exercise, and asking someone to
 * grade it would turn the last thing in the session into a form.
 *
 * ## Three ways out
 *
 * One more than this app usually allows itself, and each is a genuinely
 * different thing to want: done with the session, another go at this movement,
 * or a different movement. They are ordered by how likely they are and weighted
 * so the primary is the one that ends the session — someone who has just been
 * told to sit still and notice should not have to hunt for the door.
 */

import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GROUNDING_FADE } from '@/config/session';
import { SOMATIC_COPY } from '@/content/strings';
import { Spacing } from '@/constants/theme';

interface SomaticSettleProps {
  /** Out of the session. */
  onDone: () => void;
  /** Another run of the same movement. See `SOMATIC.extendMs`. */
  onLonger: () => void;
  /** Back to the six. */
  onAnother: () => void;
}

export function SomaticSettle({ onDone, onLonger, onAnother }: SomaticSettleProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(GROUNDING_FADE.inMs)}
      style={styles.root}>
      <View style={styles.heading}>
        <ThemedText type="title">{SOMATIC_COPY.settleTitle}</ThemedText>
        <ThemedText themeColor="textSecondary">{SOMATIC_COPY.settleBody}</ThemedText>
      </View>

      <View style={styles.actions}>
        <Button title={SOMATIC_COPY.settleDone} onPress={onDone} />
        <Button
          title={SOMATIC_COPY.settleLonger}
          variant="secondary"
          onPress={onLonger}
        />
        <Button title={SOMATIC_COPY.another} variant="ghost" onPress={onAnother} />
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
